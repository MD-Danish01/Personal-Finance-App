import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { db, schema } from "@/lib/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { getGoalLimitsAndCapacity } from "@/lib/goals-engine";

export interface MonthlyHealthCardData {
  user: {
    name: string;
    email: string;
  };
  period: {
    month: number;
    year: number;
    monthName: string;
    daysInMonth: number;
    daysElapsed: number;
  };
  score: {
    total: number; // 300 - 900
    grade: string;
    tier: string;
    breakdown: {
      savingsRateScore: number; // max 200
      safeSpendScore: number; // max 200
      goalDisciplineScore: number; // max 100
      runwayScore: number; // max 100
      baseScore: number; // 300
    };
  };
  cashflow: {
    monthlyIncome: number; // rupees
    totalExpenses: number; // rupees
    netSavings: number; // rupees
    savingsRatePercent: number; // %
    dailySafeToSpend: number; // rupees
    totalGoalAllocation: number; // rupees
  };
  compliance: {
    daysEvaluated: number;
    daysWithinBudget: number;
    compliancePercent: number;
  };
  categories: {
    category: string;
    amount: number; // rupees
    percentage: number;
  }[];
  goalsSummary: {
    activeGoalsCount: number;
    totalTargetRupees: number;
    totalAccumulatedRupees: number;
    monthlyAllocationRupees: number;
    capacityUsedPercent: number;
    status: string;
  };
  emergencyFund: {
    currentRupees: number;
    targetRupees: number;
    runwayMonths: number;
  };
  aiRecommendations: string[];
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    const searchParams = req.nextUrl.searchParams;
    const now = new Date();
    const curYear = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const curMonth = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    const pad = (n: number) => String(n).padStart(2, "0");
    const daysInMonth = new Date(curYear, curMonth, 0).getDate();
    const daysElapsed =
      curYear === now.getFullYear() && curMonth === now.getMonth() + 1
        ? now.getDate()
        : daysInMonth;

    const startStr = `${curYear}-${pad(curMonth)}-01`;
    const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
    const nextYear = curMonth === 12 ? curYear + 1 : curYear;
    const endStr = `${nextYear}-${pad(nextMonth)}-01`;

    // 1. Fetch User Profile
    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });

    // 2. Fetch Plan
    const plan = await db.query.plans.findFirst({
      where: and(
        eq(schema.plans.userId, user.id),
        eq(schema.plans.month, curMonth),
        eq(schema.plans.year, curYear),
      ),
    });

    const incomePaise = plan?.monthlyIncome ?? profile?.monthlyIncome ?? 5000000;

    // 3. Fetch Goals & Capacity
    const capacityInfo = await getGoalLimitsAndCapacity(user.id);
    const userGoals = await db.query.goals.findMany({
      where: eq(schema.goals.userId, user.id),
    });

    const activeGoals = userGoals.filter((g) => g.status !== "completed");
    const totalGoalsTargetPaise = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalGoalsAccumulatedPaise = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalGoalsMonthlyTargetPaise = activeGoals.reduce((sum, g) => sum + g.monthlyTarget, 0);

    // 4. Fetch Emergency Fund
    const emergency = await db.query.emergencyFunds.findFirst({
      where: eq(schema.emergencyFunds.userId, user.id),
    });
    const emergencyCurrentPaise = emergency?.currentAmount ?? 0;
    const emergencyTargetPaise = emergency?.targetAmount ?? incomePaise * 3;

    // 5. Fetch Monthly Transactions
    const expenseRows = await db
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
          lt(schema.transactions.transactionDate, endStr),
        ),
      )
      .groupBy(schema.transactions.category);

    const totalExpensePaise = expenseRows.reduce((acc, row) => acc + Number(row.total), 0);
    const totalExpenseRupees = Math.round(totalExpensePaise / 100);

    // Fetch Income Transactions
    const incomeRows = await db
      .select({
        total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "income"),
          gte(schema.transactions.transactionDate, startStr),
          lt(schema.transactions.transactionDate, endStr),
        ),
      );

    const recordedIncomePaise = Number(incomeRows[0]?.total ?? 0);
    const effectiveIncomePaise = recordedIncomePaise > 0 ? recordedIncomePaise : incomePaise;
    const effectiveIncomeRupees = Math.round(effectiveIncomePaise / 100);

    // 6. Safe-to-Spend & Daily Compliance
    const fixedExpensesPaise = Math.round(incomePaise * 0.4); // ~40% fixed estimate if not set
    const netSpendablePaise = Math.max(
      0,
      effectiveIncomePaise - fixedExpensesPaise - totalGoalsMonthlyTargetPaise,
    );
    const dailyQuotaPaise = Math.max(10000, Math.floor(netSpendablePaise / daysInMonth));
    const dailyQuotaRupees = Math.round(dailyQuotaPaise / 100);

    // Daily breakdown for compliance
    const dailyExpenses = await db
      .select({
        date: schema.transactions.transactionDate,
        dayTotal: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.transactionDate, startStr),
          lt(schema.transactions.transactionDate, endStr),
        ),
      )
      .groupBy(schema.transactions.transactionDate);

    const expenseMap: Record<string, number> = {};
    for (const d of dailyExpenses) {
      expenseMap[String(d.date)] = Number(d.dayTotal);
    }

    let daysWithinBudget = 0;
    for (let day = 1; day <= daysElapsed; day++) {
      const dateStr = `${curYear}-${pad(curMonth)}-${pad(day)}`;
      const dayExpensePaise = expenseMap[dateStr] || 0;
      if (dayExpensePaise <= dailyQuotaPaise) {
        daysWithinBudget++;
      }
    }

    const compliancePercent =
      daysElapsed > 0 ? Math.round((daysWithinBudget / daysElapsed) * 100) : 100;

    // 7. Calculate Financial Health Score (300 to 900)
    const netSavingsRupees = effectiveIncomeRupees - totalExpenseRupees;
    const savingsRate =
      effectiveIncomeRupees > 0
        ? Math.max(0, Math.min(100, Math.round((netSavingsRupees / effectiveIncomeRupees) * 100)))
        : 0;

    // Pillar 1: Savings Rate (Max 200)
    let savingsRateScore = 20;
    if (savingsRate >= 30) savingsRateScore = 200;
    else if (savingsRate >= 20) savingsRateScore = 160;
    else if (savingsRate >= 10) savingsRateScore = 110;
    else if (savingsRate > 0) savingsRateScore = 60;

    // Pillar 2: Safe-to-Spend Compliance (Max 200)
    const safeSpendScore = Math.round((compliancePercent / 100) * 200);

    // Pillar 3: Goal Allocation & Capacity (Max 100)
    let goalDisciplineScore = 50;
    const goalCapacityUsed =
      capacityInfo.monthlyIncomeRupees > 0
        ? Math.round(
            (capacityInfo.existingMonthlyCommitmentRupees /
              capacityInfo.monthlyIncomeRupees) *
              100,
          )
        : 0;
    if (activeGoals.length > 0 && goalCapacityUsed <= 35) {
      goalDisciplineScore = 100;
    } else if (activeGoals.length > 0 && goalCapacityUsed > 35) {
      goalDisciplineScore = 65; // stretched beyond safe capacity
    } else if (activeGoals.length === 0) {
      goalDisciplineScore = 40; // no goals set
    }

    // Pillar 4: Emergency Runway (Max 100)
    const monthlyBurnPaise = Math.max(100000, totalExpensePaise || fixedExpensesPaise);
    const runwayMonths =
      monthlyBurnPaise > 0
        ? Math.round((emergencyCurrentPaise / monthlyBurnPaise) * 10) / 10
        : 0;
    let runwayScore = 30;
    if (runwayMonths >= 6) runwayScore = 100;
    else if (runwayMonths >= 3) runwayScore = 75;
    else if (runwayMonths >= 1) runwayScore = 50;

    // Total Score
    const totalScore = Math.min(
      900,
      Math.max(300, 300 + savingsRateScore + safeSpendScore + goalDisciplineScore + runwayScore),
    );

    // Tier & Grade
    let grade = "B";
    let tier = "Moderate / Steady Progress";
    if (totalScore >= 820) {
      grade = "A+";
      tier = "Elite / Wealth Builder";
    } else if (totalScore >= 740) {
      grade = "A";
      tier = "Prime / Financially Resilient";
    } else if (totalScore >= 660) {
      grade = "B+";
      tier = "Strong / On Track";
    } else if (totalScore >= 580) {
      grade = "B";
      tier = "Moderate / Needs Optimization";
    } else if (totalScore >= 500) {
      grade = "C";
      tier = "Fair / Overspending Warning";
    } else {
      grade = "D";
      tier = "Critical / Budget Deficit";
    }

    // Category breakdown with percentages
    const categories = expenseRows.map((r) => {
      const amt = Math.round(Number(r.total) / 100);
      const pct = totalExpenseRupees > 0 ? Math.round((amt / totalExpenseRupees) * 100) : 0;
      return {
        category: r.category,
        amount: amt,
        percentage: pct,
      };
    });

    // AI Copilot Actionable Insights
    const aiRecommendations: string[] = [];
    if (savingsRate >= 20) {
      aiRecommendations.push(
        `Excellent savings rate of ${savingsRate}%. You are exceeding the standard 20% wealth-creation benchmark.`,
      );
    } else {
      aiRecommendations.push(
        `Savings rate is at ${savingsRate}%. Aim to trim discretionary expenses to reach at least 20% monthly savings.`,
      );
    }

    if (compliancePercent >= 80) {
      aiRecommendations.push(
        `Strong daily spending discipline: ${compliancePercent}% of days were kept under your daily limit (₹${dailyQuotaRupees.toLocaleString("en-IN")}/day).`,
      );
    } else {
      aiRecommendations.push(
        `Safe-to-Spend compliance is ${compliancePercent}%. Frequent daily budget breaches increase risk of end-of-month cash shortfall.`,
      );
    }

    if (activeGoals.length > 0 && goalCapacityUsed <= 35) {
      aiRecommendations.push(
        `Goals auto-allocation is well balanced (${goalCapacityUsed}% of income), safeguarding daily liquidity.`,
      );
    } else if (goalCapacityUsed > 35) {
      aiRecommendations.push(
        `Warning: Goals commitment is high (${goalCapacityUsed}% of income). Consider rebalancing goals to restore daily spendable cash.`,
      );
    } else {
      aiRecommendations.push(
        `You have 0 active savings goals. Create a dedicated goal (e.g. Vacation, Gadget, Car) to automate your wealth building.`,
      );
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const data: MonthlyHealthCardData = {
      user: {
        name: user.name || "Finance Champion",
        email: user.email || "",
      },
      period: {
        month: curMonth,
        year: curYear,
        monthName: `${monthNames[curMonth - 1]} ${curYear}`,
        daysInMonth,
        daysElapsed,
      },
      score: {
        total: totalScore,
        grade,
        tier,
        breakdown: {
          baseScore: 300,
          savingsRateScore,
          safeSpendScore,
          goalDisciplineScore,
          runwayScore,
        },
      },
      cashflow: {
        monthlyIncome: effectiveIncomeRupees,
        totalExpenses: totalExpenseRupees,
        netSavings: Math.max(0, netSavingsRupees),
        savingsRatePercent: savingsRate,
        dailySafeToSpend: dailyQuotaRupees,
        totalGoalAllocation: Math.round(totalGoalsMonthlyTargetPaise / 100),
      },
      compliance: {
        daysEvaluated: daysElapsed,
        daysWithinBudget,
        compliancePercent,
      },
      categories,
      goalsSummary: {
        activeGoalsCount: activeGoals.length,
        totalTargetRupees: Math.round(totalGoalsTargetPaise / 100),
        totalAccumulatedRupees: Math.round(totalGoalsAccumulatedPaise / 100),
        monthlyAllocationRupees: Math.round(totalGoalsMonthlyTargetPaise / 100),
        capacityUsedPercent: goalCapacityUsed,
        status:
          goalCapacityUsed > 35
            ? "Exceeds Safe Limit (>35%)"
            : "Protected & Auto-Allocated",
      },
      emergencyFund: {
        currentRupees: Math.round(emergencyCurrentPaise / 100),
        targetRupees: Math.round(emergencyTargetPaise / 100),
        runwayMonths,
      },
      aiRecommendations,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error generating monthly health card:", error);
    return NextResponse.json(
      { error: "Failed to generate monthly health card" },
      { status: 500 },
    );
  }
}
