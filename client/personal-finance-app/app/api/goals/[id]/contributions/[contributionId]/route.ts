import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  calculateGoalProgress,
  contributionIdSchema,
  contributionUpdateSchema,
  goalIdSchema,
  validationError,
} from "@/lib/goals";

type RouteContext = {
  params: Promise<{ id: string; contributionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id, contributionId } = await context.params;
    const parsedGoalId = goalIdSchema.safeParse(id);
    const parsedContributionId = contributionIdSchema.safeParse(contributionId);
    if (!parsedGoalId.success || !parsedContributionId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = contributionUpdateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await db.transaction(async (tx) => {
      const [ownedContribution] = await tx
        .select({ goal: schema.goals, contribution: schema.goalContributions })
        .from(schema.goalContributions)
        .innerJoin(schema.goals, eq(schema.goals.id, schema.goalContributions.goalId))
        .where(
          and(
            eq(schema.goalContributions.id, parsedContributionId.data),
            eq(schema.goalContributions.goalId, parsedGoalId.data),
            eq(schema.goals.userId, userId),
          ),
        )
        .limit(1);
      if (!ownedContribution) return null;

      const [contribution] = await tx
        .update(schema.goalContributions)
        .set({
          amount: parsed.data.amount,
          note: parsed.data.note,
          contributedAt: parsed.data.contributedAt
            ? new Date(parsed.data.contributedAt)
            : undefined,
        })
        .where(eq(schema.goalContributions.id, ownedContribution.contribution.id))
        .returning();
      const contributions = await tx
        .select({ amount: schema.goalContributions.amount })
        .from(schema.goalContributions)
        .where(eq(schema.goalContributions.goalId, ownedContribution.goal.id));
      const progress = calculateGoalProgress(ownedContribution.goal.targetAmount, contributions);
      await tx
        .update(schema.goals)
        .set({ currentAmount: progress.contributedAmount, updatedAt: new Date() })
        .where(eq(schema.goals.id, ownedContribution.goal.id));

      return { contribution, progress };
    });

    if (!result) return Response.json({ error: "Contribution not found" }, { status: 404 });
    return Response.json(result);
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
    const userId = session.user.id;
    const { id, contributionId } = await context.params;
    const parsedGoalId = goalIdSchema.safeParse(id);
    const parsedContributionId = contributionIdSchema.safeParse(contributionId);
    if (!parsedGoalId.success || !parsedContributionId.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [ownedContribution] = await tx
        .select({ goal: schema.goals, contribution: schema.goalContributions })
        .from(schema.goalContributions)
        .innerJoin(schema.goals, eq(schema.goals.id, schema.goalContributions.goalId))
        .where(
          and(
            eq(schema.goalContributions.id, parsedContributionId.data),
            eq(schema.goalContributions.goalId, parsedGoalId.data),
            eq(schema.goals.userId, userId),
          ),
        )
        .limit(1);
      if (!ownedContribution) return null;

      await tx
        .delete(schema.goalContributions)
        .where(eq(schema.goalContributions.id, ownedContribution.contribution.id));
      const contributions = await tx
        .select({ amount: schema.goalContributions.amount })
        .from(schema.goalContributions)
        .where(eq(schema.goalContributions.goalId, ownedContribution.goal.id));
      const progress = calculateGoalProgress(ownedContribution.goal.targetAmount, contributions);
      await tx
        .update(schema.goals)
        .set({ currentAmount: progress.contributedAmount, updatedAt: new Date() })
        .where(eq(schema.goals.id, ownedContribution.goal.id));

      return progress;
    });

    if (!result) return Response.json({ error: "Contribution not found" }, { status: 404 });
    return Response.json({ success: true, ...result });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
