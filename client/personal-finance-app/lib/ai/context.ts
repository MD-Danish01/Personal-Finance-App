import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface CategorySpendSummary {
  category: string;
  amountRupees: number;
  percentOfTotal: number;
}

export interface GoalSummary {
  id: string;
  name: string;
  icon: string;
  targetRupees: number;
  currentRupees: number;
  percent: number;
  deadline: string | null;
}

export interface StructuredFinancialContext {
  userId: string;
  incomeRupees: number;
  spentRupees: number;
  budgetRupees: number;
  dailySafeToSpendRupees: number;
  remainingDays: number;
  daysInMonth: number;
  savingsRatePercent: number;
  byCategory: CategorySpendSummary[];
  goals: GoalSummary[];
  emergencyFund: {
    targetRupees: number;
    currentRupees: number;
    runwayMonths: number;
    targetMonths: number;
  };
  overspentCategories: string[];
}

export interface PurchaseSimulationResult {
  purchaseAmountRupees: number;
  itemName: string;
  category: string;
  originalDailySafeToSpend: number;
  newDailySafeToSpend: number;
  dailyDropRupees: number;
  dropPercent: number;
  status: "SAFE" | "TIGHT" | "DEFICIT";
  statusLabel: string;
  remainingDays: number;
  goalImpactText: string;
  recoveryOptions: string[];
}

export async function getStructuredFinancialContext(
  userId: string,
): Promise<StructuredFinancialContext> {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  const startStr = `${curYear}-${pad(curMonth)}-01`;
  const lastDay = new Date(curYear, curMonth, 0).getDate();
  const endStr = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;

  const currentDay = now.getDate();
  const remainingDays = Math.max(1, lastDay - currentDay + 1);

  // 1. Profile & Income
  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, userId),
  });
  const incomePaise = profile?.monthlyIncome ?? 0;
  const incomeRupees = Math.round(incomePaise / 100);

  // 2. Active Plan
  const plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, userId),
      eq(schema.plans.month, curMonth),
      eq(schema.plans.year, curYear),
    ),
  });
  const budgetPaise = plan?.monthlyIncome ?? incomePaise;
  const budgetRupees = Math.round(budgetPaise / 100);

  // 3. Transactions by Category
  const categoryRows = await db
    .select({
      category: schema.transactions.category,
      total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.transactionDate, startStr),
        lte(schema.transactions.transactionDate, endStr),
      ),
    )
    .groupBy(schema.transactions.category);

  const totalSpentPaise = categoryRows.reduce((sum, r) => sum + Number(r.total), 0);
  const spentRupees = Math.round(totalSpentPaise / 100);

  const byCategory: CategorySpendSummary[] = categoryRows.map((r) => {
    const amtPaise = Number(r.total);
    return {
      category: r.category,
      amountRupees: Math.round(amtPaise / 100),
      percentOfTotal: totalSpentPaise > 0 ? Math.round((amtPaise / totalSpentPaise) * 100) : 0,
    };
  });

  // 4. Safe-to-Spend
  const remainingBudgetPaise = Math.max(0, budgetPaise - totalSpentPaise);
  const dailySafeToSpendRupees = Math.max(
    0,
    Math.round(remainingBudgetPaise / remainingDays / 100),
  );

  // 5. Savings Rate
  const savingsRatePercent =
    incomeRupees > 0
      ? Math.max(0, Math.round(((incomeRupees - spentRupees) / incomeRupees) * 100))
      : 0;

  // 6. Goals
  const goalRows = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId))
    .orderBy(desc(schema.goals.createdAt));

  const goals: GoalSummary[] = goalRows.map((g) => {
    const cur = Math.round(g.currentAmount / 100);
    const tgt = Math.round(g.targetAmount / 100);
    return {
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetRupees: tgt,
      currentRupees: cur,
      percent: tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0,
      deadline: g.deadline,
    };
  });

  // 7. Limits & Overspent Categories
  const limitRows = await db
    .select()
    .from(schema.limits)
    .where(eq(schema.limits.userId, userId));

  const overspentCategories: string[] = [];
  for (const lim of limitRows) {
    const catSpend = byCategory.find((c) => c.category === lim.category);
    if (catSpend && catSpend.amountRupees > Math.round(lim.monthlyLimit / 100)) {
      overspentCategories.push(lim.category);
    }
  }

  // 8. Emergency Fund
  const emergencyRow = await db.query.emergencyFunds.findFirst({
    where: eq(schema.emergencyFunds.userId, userId),
  });

  const monthlyEssentialsPaise = Math.round(incomePaise * ((profile?.essentialsPercent ?? 50) / 100));
  const emergencyCurrentPaise = emergencyRow?.currentAmount ?? 0;
  const runwayMonths =
    monthlyEssentialsPaise > 0
      ? parseFloat((emergencyCurrentPaise / monthlyEssentialsPaise).toFixed(1))
      : 0;

  return {
    userId,
    incomeRupees,
    spentRupees,
    budgetRupees,
    dailySafeToSpendRupees,
    remainingDays,
    daysInMonth: lastDay,
    savingsRatePercent,
    byCategory,
    goals,
    emergencyFund: {
      targetRupees: Math.round((emergencyRow?.targetAmount ?? 0) / 100),
      currentRupees: Math.round(emergencyCurrentPaise / 100),
      runwayMonths,
      targetMonths: profile?.emergencyMonthsTarget ?? 6,
    },
    overspentCategories,
  };
}

export function simulatePurchaseImpact(
  context: StructuredFinancialContext,
  purchaseAmountRupees: number,
  itemName: string = "Prospective Expense",
  category: string = "Shopping",
): PurchaseSimulationResult {
  const currentAvailableRupees = Math.max(0, context.budgetRupees - context.spentRupees);
  const newAvailableRupees = Math.max(0, currentAvailableRupees - purchaseAmountRupees);
  const newDailySafeToSpend = Math.max(
    0,
    Math.round(newAvailableRupees / context.remainingDays),
  );

  const dailyDropRupees = Math.max(0, context.dailySafeToSpendRupees - newDailySafeToSpend);
  const dropPercent =
    context.dailySafeToSpendRupees > 0
      ? Math.min(100, Math.round((dailyDropRupees / context.dailySafeToSpendRupees) * 100))
      : 100;

  let status: "SAFE" | "TIGHT" | "DEFICIT" = "SAFE";
  let statusLabel = "Safe & Affordable";

  if (purchaseAmountRupees > currentAvailableRupees) {
    status = "DEFICIT";
    statusLabel = "Causes Monthly Deficit";
  } else if (newDailySafeToSpend < 200 || dropPercent >= 50) {
    status = "TIGHT";
    statusLabel = "Tightens Daily Cashflow";
  }

  // Goal delay estimate
  let goalImpactText = "No major impact on your active goals.";
  if (context.goals.length > 0) {
    const topGoal = context.goals[0];
    const remainingGoalPaise = (topGoal.targetRupees - topGoal.currentRupees) * 100;
    if (remainingGoalPaise > 0) {
      const daysDelay = Math.min(
        30,
        Math.round((purchaseAmountRupees / (context.incomeRupees || 1)) * 30),
      );
      goalImpactText = `May delay your "${topGoal.name}" goal target by ~${Math.max(3, daysDelay)} days.`;
    }
  }

  const recoveryOptions: string[] = [
    `Limit discretionary spend to ₹${newDailySafeToSpend}/day for the remaining ${context.remainingDays} days.`,
    `Trim ₹${Math.round(purchaseAmountRupees * 0.4).toLocaleString("en-IN")} from Food & Shopping over the next 2 weeks.`,
  ];

  return {
    purchaseAmountRupees,
    itemName,
    category,
    originalDailySafeToSpend: context.dailySafeToSpendRupees,
    newDailySafeToSpend,
    dailyDropRupees,
    dropPercent,
    status,
    statusLabel,
    remainingDays: context.remainingDays,
    goalImpactText,
    recoveryOptions,
  };
}
