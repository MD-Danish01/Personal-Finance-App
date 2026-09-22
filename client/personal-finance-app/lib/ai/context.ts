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
  todaySpentRupees: number;
  todayDesignatedRupees: number;
  todayRemainingRupees: number;
  isTodayOverspent: boolean;
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
  todaySpentRupees: number;
  todayDesignatedRupees: number;
  todayRemainingRupees: number;
  isTodayAlreadyOverspent: boolean;
  willExceedTodayBudget: boolean;
  todayOverspentDelta: number;
  todayImpactNote: string;
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

  // 4. Today's Spend & Designated Daily Budget
  const todayStr = `${curYear}-${pad(curMonth)}-${pad(currentDay)}`;
  const todayExpenseRows = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "expense"),
        eq(schema.transactions.transactionDate, todayStr),
      ),
    );

  const todaySpentPaise = Number(todayExpenseRows[0]?.total ?? 0);
  const todaySpentRupees = Math.round(todaySpentPaise / 100);

  // Month-to-date expenses prior to today
  const spentPriorToTodayPaise = Math.max(0, totalSpentPaise - todaySpentPaise);
  // Designated daily safe-to-spend at the beginning of today
  const availableAtStartOfTodayPaise = Math.max(0, budgetPaise - spentPriorToTodayPaise);
  const todayDesignatedRupees = Math.max(
    0,
    Math.round(availableAtStartOfTodayPaise / remainingDays / 100),
  );
  const todayRemainingRupees = Math.max(0, todayDesignatedRupees - todaySpentRupees);
  const isTodayOverspent = todayDesignatedRupees > 0 && todaySpentRupees >= todayDesignatedRupees;

  // Safe-to-Spend for remaining days
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
    todaySpentRupees,
    todayDesignatedRupees,
    todayRemainingRupees,
    isTodayOverspent,
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
  
  // Future daily safe-to-spend after absorbing this purchase across remaining days
  const futureDays = Math.max(1, context.remainingDays - 1);
  const newDailySafeToSpend = Math.max(
    0,
    Math.round(newAvailableRupees / (context.remainingDays > 1 ? futureDays : 1)),
  );

  const baselineDaily = context.todayDesignatedRupees > 0 ? context.todayDesignatedRupees : context.dailySafeToSpendRupees;
  const dailyDropRupees = Math.max(0, baselineDaily - newDailySafeToSpend);
  const dropPercent =
    baselineDaily > 0
      ? Math.min(100, Math.round((dailyDropRupees / baselineDaily) * 100))
      : 100;

  // Daily budget tracking
  const isTodayAlreadyOverspent = context.isTodayOverspent || (context.todayDesignatedRupees > 0 && context.todaySpentRupees >= context.todayDesignatedRupees);
  const projectedTodaySpend = context.todaySpentRupees + purchaseAmountRupees;
  const willExceedTodayBudget = context.todayDesignatedRupees > 0 && projectedTodaySpend > context.todayDesignatedRupees;
  const todayOverspentDelta = willExceedTodayBudget ? Math.max(0, projectedTodaySpend - context.todayDesignatedRupees) : 0;

  let status: "SAFE" | "TIGHT" | "DEFICIT" = "SAFE";
  let statusLabel = "Safe & Affordable";
  let todayImpactNote = "";

  if (purchaseAmountRupees > currentAvailableRupees) {
    status = "DEFICIT";
    statusLabel = "Causes Monthly Deficit";
    todayImpactNote = `This ₹${purchaseAmountRupees.toLocaleString("en-IN")} purchase exceeds your remaining monthly unallocated funds (₹${currentAvailableRupees.toLocaleString("en-IN")}) by ₹${(purchaseAmountRupees - currentAvailableRupees).toLocaleString("en-IN")}, forcing you to dip into savings.`;
  } else if (isTodayAlreadyOverspent) {
    status = "DEFICIT";
    statusLabel = "Exceeds Today's Budget";
    todayImpactNote = `You have already exhausted today's designated money (spent ₹${context.todaySpentRupees.toLocaleString("en-IN")} of ₹${context.todayDesignatedRupees.toLocaleString("en-IN")} daily quota). Buying "${itemName}" today adds ₹${purchaseAmountRupees.toLocaleString("en-IN")} to today's deficit and directly penalizes tomorrow and future days, dropping your safe daily allowance to ₹${newDailySafeToSpend}/day.`;
  } else if (willExceedTodayBudget) {
    status = todayOverspentDelta >= context.todayDesignatedRupees * 0.5 ? "DEFICIT" : "TIGHT";
    statusLabel = "Exceeds Today's Allowance";
    todayImpactNote = `You have ₹${context.todayRemainingRupees.toLocaleString("en-IN")} left in today's safe allowance. Buying this item for ₹${purchaseAmountRupees.toLocaleString("en-IN")} will overrun today's designated limit by ₹${todayOverspentDelta.toLocaleString("en-IN")}, borrowing cash from future days.`;
  } else if (newDailySafeToSpend < 200 || dropPercent >= 50) {
    status = "TIGHT";
    statusLabel = "Tightens Daily Cashflow";
    todayImpactNote = `Fits within today's remaining allowance (leaves ₹${Math.max(0, context.todayRemainingRupees - purchaseAmountRupees).toLocaleString("en-IN")} for today), but significantly compresses your daily allowance for remaining days to ₹${newDailySafeToSpend}/day.`;
  } else {
    status = "SAFE";
    statusLabel = "Safe & Within Today's Limit";
    todayImpactNote = `Fits within today's remaining safe allowance of ₹${context.todayRemainingRupees.toLocaleString("en-IN")}. You will have ₹${Math.max(0, context.todayRemainingRupees - purchaseAmountRupees).toLocaleString("en-IN")} left for the rest of today.`;
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

  const recoveryOptions: string[] = [];
  if (isTodayAlreadyOverspent || willExceedTodayBudget) {
    recoveryOptions.push(
      `Postpone this purchase until tomorrow so it comes out of a refreshed daily allowance rather than running an immediate overdraft.`
    );
    recoveryOptions.push(
      `If purchased today, cap your discretionary spending at ₹${newDailySafeToSpend}/day for the remaining ${context.remainingDays} days to rebalance.`
    );
    if (category === "Shopping" || category === "Entertainment" || category === "Food") {
      recoveryOptions.push(
        `Trim ₹${Math.round(purchaseAmountRupees * 0.4).toLocaleString("en-IN")} from ${category} over the coming week to recover the deficit.`
      );
    }
  } else {
    recoveryOptions.push(
      `Limit discretionary spend to ₹${newDailySafeToSpend}/day for the remaining ${context.remainingDays} days.`
    );
    recoveryOptions.push(
      `Keep an eye on discretionary impulse buys to preserve your ₹${context.emergencyFund.currentRupees.toLocaleString("en-IN")} emergency cushion.`
    );
  }

  return {
    purchaseAmountRupees,
    itemName,
    category,
    originalDailySafeToSpend: baselineDaily,
    newDailySafeToSpend,
    dailyDropRupees,
    dropPercent,
    status,
    statusLabel,
    remainingDays: context.remainingDays,
    goalImpactText,
    recoveryOptions,
    todaySpentRupees: context.todaySpentRupees,
    todayDesignatedRupees: context.todayDesignatedRupees,
    todayRemainingRupees: context.todayRemainingRupees,
    isTodayAlreadyOverspent,
    willExceedTodayBudget,
    todayOverspentDelta,
    todayImpactNote,
  };
}
