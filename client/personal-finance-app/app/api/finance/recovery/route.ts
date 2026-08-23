import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { calculateFinancialSnapshot } from "@/lib/finance";
import { calculateRecovery } from "@/lib/finance/recovery";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [profileRows, planRows, transactions, goals, limits, emergencyRows] =
      await Promise.all([
        db
          .select()
          .from(schema.financialProfiles)
          .where(eq(schema.financialProfiles.userId, userId))
          .limit(1),
        db
          .select()
          .from(schema.plans)
          .where(and(eq(schema.plans.userId, userId), eq(schema.plans.status, "active")))
          .orderBy(desc(schema.plans.updatedAt), desc(schema.plans.createdAt))
          .limit(1),
        db
          .select({
            amount: schema.transactions.amount,
            type: schema.transactions.type,
            category: schema.transactions.category,
            financialBucket: schema.transactions.financialBucket,
            transactionDate: schema.transactions.transactionDate,
          })
          .from(schema.transactions)
          .where(eq(schema.transactions.userId, userId)),
        db
          .select()
          .from(schema.goals)
          .where(eq(schema.goals.userId, userId)),
        db
          .select()
          .from(schema.limits)
          .where(eq(schema.limits.userId, userId)),
        db
          .select()
          .from(schema.emergencyFunds)
          .where(eq(schema.emergencyFunds.userId, userId))
          .limit(1),
      ]);

    const activePlan = planRows[0] ?? null;
    const asOfDate = new Date();
    const periodYear = activePlan?.year ?? asOfDate.getUTCFullYear();
    const periodMonth = activePlan?.month ?? asOfDate.getUTCMonth() + 1;
    const periodTransactions = transactions.filter((transaction) => {
      const [year, month] = transaction.transactionDate.split("-").map(Number);
      return year === periodYear && month === periodMonth;
    });

    const [allocations, goalContributions] = await Promise.all([
      activePlan
        ? db
            .select({
              key: schema.planAllocations.key,
              amount: schema.planAllocations.amount,
            })
            .from(schema.planAllocations)
            .innerJoin(schema.plans, eq(schema.plans.id, schema.planAllocations.planId))
            .where(and(eq(schema.planAllocations.planId, activePlan.id), eq(schema.plans.userId, userId)))
            .orderBy(asc(schema.planAllocations.id))
        : Promise.resolve([]),
      goals.length
        ? db
            .select({
              goalId: schema.goalContributions.goalId,
              amount: schema.goalContributions.amount,
            })
            .from(schema.goalContributions)
            .innerJoin(schema.goals, eq(schema.goals.id, schema.goalContributions.goalId))
            .where(and(inArray(schema.goalContributions.goalId, goals.map((goal) => goal.id)), eq(schema.goals.userId, userId)))
        : Promise.resolve([]),
    ]);

    const contributionsByGoal = new Map<string, Array<{ amount: number }>>();
    for (const contribution of goalContributions) {
      const current = contributionsByGoal.get(contribution.goalId) ?? [];
      current.push({ amount: contribution.amount });
      contributionsByGoal.set(contribution.goalId, current);
    }

    const snapshot = calculateFinancialSnapshot({
      profile: profileRows[0] ?? null,
      activePlan: activePlan ? { ...activePlan, allocations } : null,
      transactions: periodTransactions,
      goals: goals.map((goal) => ({
        ...goal,
        contributions: contributionsByGoal.get(goal.id) ?? [],
      })),
      limits,
      emergencyFund: emergencyRows[0] ?? null,
      asOfDate,
    });

    return Response.json(calculateRecovery(snapshot));
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
