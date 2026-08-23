import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  ALLOCATION_LABELS,
  ALLOCATION_COLORS,
} from "@/lib/constants";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  const startStr = startOfMonth.toISOString().slice(0, 10);
  const endStr = endOfMonth.toISOString().slice(0, 10);

  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });
  const monthlyIncome = profile?.monthlyIncome ?? 0;

  const plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, user.id),
      eq(schema.plans.month, month),
      eq(schema.plans.year, year),
    ),
  });

  let allocations: { key: string; amount: number; percent: number }[] = [];
  if (plan) {
    allocations = await db
      .select({
        key: schema.planAllocations.key,
        amount: schema.planAllocations.amount,
        percent: schema.planAllocations.percent,
      })
      .from(schema.planAllocations)
      .where(eq(schema.planAllocations.planId, plan.id));
  }

  const categoryRows = await db
    .select({
      category: schema.transactions.category,
      total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, user.id),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.transactionDate, startStr),
        lte(schema.transactions.transactionDate, endStr),
      ),
    )
    .groupBy(schema.transactions.category);

  const spentByCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    spentByCategory[row.category] = Number(row.total);
  }

  const monthSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const monthBudget = plan?.monthlyIncome ?? monthlyIncome;

  const daysInMonth = endOfMonth.getDate();
  const dayOfMonth = now.getDate();
  const remainingDays = daysInMonth - dayOfMonth + 1;
  const safeToSpend =
    monthBudget > 0
      ? Math.max(0, Math.round((monthBudget - monthSpent) / remainingDays))
      : 0;

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, user.id))
    .orderBy(desc(schema.goals.createdAt));

  const topGoal = goals[0]
    ? {
        name: goals[0].name,
        icon: goals[0].icon,
        current: goals[0].currentAmount,
        target: goals[0].targetAmount,
        colorClass: "bg-brand-purple",
      }
    : null;

  const overview = allocations.map((a) => ({
    label: ALLOCATION_LABELS[a.key as keyof typeof ALLOCATION_LABELS] ?? a.key,
    amount: spentByCategory[a.key] ?? 0,
    of: a.amount,
    colorClass: ALLOCATION_COLORS[a.key as keyof typeof ALLOCATION_COLORS] ?? "bg-gray-dot",
  }));

  const insightText = monthSpent < monthBudget * 0.8
    ? `You're ₹${Math.round((monthBudget - monthSpent) / 100)} ahead of your spending plan. Great job!`
    : monthSpent > monthBudget
      ? `You've exceeded your monthly budget by ₹${Math.round((monthSpent - monthBudget) / 100)}.`
      : "You're on track with your spending plan.";

  const insightTone =
    monthSpent < monthBudget * 0.8
      ? "positive"
      : monthSpent > monthBudget
        ? "warning"
        : "info";

  return Response.json({
    greetingName: user.name,
    safeToSpendToday: safeToSpend,
    safeToSpendSubtitle: "Stays within your plan",
    monthSpent,
    monthBudget,
    overview,
    topGoal,
    insight: { text: insightText, tone: insightTone },
  });
}
