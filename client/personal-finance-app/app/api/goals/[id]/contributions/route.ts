import { asc, and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  calculateGoalProgress,
  contributionCreateSchema,
  goalIdSchema,
  validationError,
} from "@/lib/goals";

type RouteContext = { params: Promise<{ id: string }> };

async function getGoalId(context: RouteContext) {
  const { id } = await context.params;
  return goalIdSchema.safeParse(id);
}

export async function GET(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsedId = await getGoalId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const [goal] = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, parsedId.data), eq(schema.goals.userId, session.user.id)))
      .limit(1);
    if (!goal) return Response.json({ error: "Goal not found" }, { status: 404 });

    const contributions = await db
      .select()
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goal.id))
      .orderBy(asc(schema.goalContributions.contributedAt));

    return Response.json({
      items: contributions,
      ...calculateGoalProgress(goal.targetAmount, contributions),
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const parsedId = await getGoalId(context);
    if (!parsedId.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = contributionCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await db.transaction(async (tx) => {
      const [goal] = await tx
        .select()
        .from(schema.goals)
        .where(and(eq(schema.goals.id, parsedId.data), eq(schema.goals.userId, userId)))
        .limit(1);
      if (!goal) return null;

      const [contribution] = await tx
        .insert(schema.goalContributions)
        .values({
          goalId: goal.id,
          amount: parsed.data.amount,
          note: parsed.data.note,
          contributedAt: parsed.data.contributedAt
            ? new Date(parsed.data.contributedAt)
            : undefined,
        })
        .returning();
      const contributions = await tx
        .select({ amount: schema.goalContributions.amount })
        .from(schema.goalContributions)
        .where(eq(schema.goalContributions.goalId, goal.id));
      const progress = calculateGoalProgress(goal.targetAmount, contributions);
      await tx
        .update(schema.goals)
        .set({ currentAmount: progress.contributedAmount, updatedAt: new Date() })
        .where(eq(schema.goals.id, goal.id));

      return { contribution, progress };
    });

    if (!result) return Response.json({ error: "Goal not found" }, { status: 404 });
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
