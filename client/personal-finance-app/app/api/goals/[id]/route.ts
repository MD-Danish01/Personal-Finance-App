import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  calculateGoalProgress,
  goalIdSchema,
  goalUpdateSchema,
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
    const userId = session.user.id;

    const parsedId = await getGoalId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const [goal] = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, parsedId.data), eq(schema.goals.userId, userId)))
      .limit(1);
    if (!goal) return Response.json({ error: "Goal not found" }, { status: 404 });

    const contributions = await db
      .select()
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goal.id))
      .orderBy(asc(schema.goalContributions.contributedAt));

    return Response.json({
      ...goal,
      ...calculateGoalProgress(goal.targetAmount, contributions),
      contributions,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsedId = await getGoalId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = goalUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const goal = await db.transaction(async (tx) => {
      const [ownedGoal] = await tx
        .select()
        .from(schema.goals)
        .where(and(eq(schema.goals.id, parsedId.data), eq(schema.goals.userId, userId)))
        .limit(1);
      if (!ownedGoal) return null;

      const contributions = await tx
        .select({ amount: schema.goalContributions.amount })
        .from(schema.goalContributions)
        .where(eq(schema.goalContributions.goalId, ownedGoal.id));
      const targetAmount = parsed.data.targetAmount ?? ownedGoal.targetAmount;
      const progress = calculateGoalProgress(targetAmount, contributions);

      const [updatedGoal] = await tx
        .update(schema.goals)
        .set({ ...parsed.data, currentAmount: progress.contributedAmount, updatedAt: new Date() })
        .where(eq(schema.goals.id, ownedGoal.id))
        .returning();
      return { goal: updatedGoal, contributions };
    });

    if (!goal) return Response.json({ error: "Goal not found" }, { status: 404 });
    return Response.json({
      ...goal.goal,
      ...calculateGoalProgress(goal.goal.targetAmount, goal.contributions),
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  void request;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedId = await getGoalId(context);
    if (!parsedId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const [deletedGoal] = await db
      .delete(schema.goals)
      .where(and(eq(schema.goals.id, parsedId.data), eq(schema.goals.userId, session.user.id)))
      .returning({ id: schema.goals.id });
    if (!deletedGoal) return Response.json({ error: "Goal not found" }, { status: 404 });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
