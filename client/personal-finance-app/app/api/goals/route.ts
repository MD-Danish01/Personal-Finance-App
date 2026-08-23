import { asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  calculateGoalProgress,
  goalCreateSchema,
  validationError,
} from "@/lib/goals";

async function getGoalsWithProgress(userId: string) {
  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId))
    .orderBy(desc(schema.goals.status), asc(schema.goals.deadline), desc(schema.goals.createdAt));

  if (!goals.length) return [];

  const contributions = await db
    .select()
    .from(schema.goalContributions)
    .where(inArray(schema.goalContributions.goalId, goals.map((goal) => goal.id)));
  const contributionsByGoal = new Map<string, typeof contributions>();

  for (const contribution of contributions) {
    const current = contributionsByGoal.get(contribution.goalId) ?? [];
    current.push(contribution);
    contributionsByGoal.set(contribution.goalId, current);
  }

  return goals.map((goal) => ({
    ...goal,
    ...calculateGoalProgress(goal.targetAmount, contributionsByGoal.get(goal.id) ?? []),
  }));
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ items: await getGoalsWithProgress(session.user.id) });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = goalCreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const [goal] = await db
      .insert(schema.goals)
      .values({ ...parsed.data, userId: session.user.id })
      .returning();

    return Response.json(
      { ...goal, ...calculateGoalProgress(goal.targetAmount, []) },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
