import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  ALLOCATION_LABELS,
  ALLOCATION_COLORS,
} from "@/lib/constants";
import { sendMonthlyReportIfDue } from "@/lib/monthly-report";
import { processMonthlyGoalAutoAllocations } from "@/lib/goals-engine";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  try {
    void sendMonthlyReportIfDue(user.id).catch((error) =>
      console.error("Monthly report error:", error),
    );
    void processMonthlyGoalAutoAllocations(user.id).catch((error) =>
      console.error("Goal auto-allocation error:", error),
    );

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, "0");

    const startStr = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${pad(month)}-${pad(lastDay)}`;

    const profile = await db.query.financialProfiles.findFirst({
      where: eq(schema.financialProfiles.userId, user.id),
    });
    const monthlyIncome = profile?.monthlyIncome ?? 0;

    let plan = await db.query.plans.findFirst({
      where: and(
        eq(schema.plans.userId, user.id),
        eq(schema.plans.month, month),
        eq(schema.plans.year, year),
      ),
    });

    // If profile exists with income but plan is missing for this month, auto-create plan
    if (!plan && monthlyIncome > 0 && profile) {
      const [newPlan] = await db
        .insert(schema.plans)
        .values({
          userId: user.id,
          month,
          year,
          monthlyIncome,
          status: "active",
          whyThisPlan:
            "Balanced plan designed to secure essentials and systematically grow savings.",
        })
        .returning();
      plan = newPlan;

      const defaultKeys = [
        { key: "essentials" as const, percent: profile.essentialsPercent },
        { key: "enjoyment" as const, percent: profile.enjoymentPercent },
        { key: "emergency" as const, percent: Math.round(profile.savingsPercent * 0.4) },
        { key: "future_savings" as const, percent: Math.round(profile.savingsPercent * 0.4) },
        { key: "long_term_wealth" as const, percent: Math.round(profile.savingsPercent * 0.2) },
        { key: "buffer" as const, percent: profile.bufferPercent },
      ];

      for (const alloc of defaultKeys) {
        await db.insert(schema.planAllocations).values({
          planId: plan.id,
          key: alloc.key,
          amount: Math.round((monthlyIncome * alloc.percent) / 100),
          percent: alloc.percent,
        });
      }
    }

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

    // Fetch user goals early to protect goal allocations from daily spending
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
          colorClass: "bg-primary",
        }
      : null;

    // Calculate total monthly target committed to active savings goals
    const activeGoals = goals.filter((g) => g.status !== "completed");
    const totalGoalsMonthlyTargetPaise = activeGoals.reduce(
      (sum, g) => sum + (g.monthlyTarget || 0),
      0,
    );
    const totalGoalsMonthlyTargetRupees = Math.round(
      totalGoalsMonthlyTargetPaise / 100,
    );

    // NET SPENDABLE BUDGET:
    // Protect savings goals by deducting their committed monthly target
    // from the discretionary daily spending pool.
    const netSpendableBudgetPaise = Math.max(
      0,
      monthBudget - totalGoalsMonthlyTargetPaise,
    );

    const daysInMonth = lastDay;
    const dayOfMonth = now.getDate();
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);

    // Today's spending & designated daily budget calculations
    const todayStr = `${year}-${pad(month)}-${pad(dayOfMonth)}`;
    const todayExpenseRows = await db
      .select({
        total: sql<number>`coalesce(sum(${schema.transactions.amount}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, user.id),
          eq(schema.transactions.type, "expense"),
          eq(schema.transactions.transactionDate, todayStr),
        ),
      );

    const todaySpentPaise = Number(todayExpenseRows[0]?.total ?? 0);
    const todaySpentRupees = Math.round(todaySpentPaise / 100);

    // Keep today's quota anchored to the net spendable monthly budget.
    const dailyQuotaPaise = Math.round(netSpendableBudgetPaise / daysInMonth);
    const monthStart = new Date(year, month - 1, 1);
    const isNewUserThisMonth = profile
      ? profile.createdAt >= monthStart
      : false;
    const todayDesignatedRupees = Math.max(
      0,
      Math.round(dailyQuotaPaise / 100),
    );

    const isOverDailyBudget = todayDesignatedRupees > 0 && todaySpentRupees > todayDesignatedRupees;
    const overspentAmount = isOverDailyBudget ? todaySpentRupees - todayDesignatedRupees : 0;
    const todayRemainingRupees = isOverDailyBudget
      ? 0
      : Math.max(0, todayDesignatedRupees - todaySpentRupees);

    // Future daily safe-to-spend baseline across remaining days after today
    const futureDays = Math.max(1, remainingDays - 1);
    const spentBeforeTodayPaise = Math.max(0, monthSpent - todaySpentPaise);
    const elapsedDaysBudgetPaise = dailyQuotaPaise * Math.max(0, dayOfMonth - 1);
    const consumedBeforeTodayPaise = isNewUserThisMonth
      ? Math.max(spentBeforeTodayPaise, elapsedDaysBudgetPaise)
      : spentBeforeTodayPaise;

    // Remaining spendable envelope respects protected goal commitments
    const remainingMonthPaise = Math.max(
      0,
      netSpendableBudgetPaise - consumedBeforeTodayPaise - todaySpentPaise,
    );
    const baselineDailyRate = Math.max(
      0,
      Math.round(remainingMonthPaise / (remainingDays > 1 ? futureDays : 1) / 100),
    );

    // Query goal contributions this month
    const goalContribRows = await db
      .select({
        total: sql<number>`coalesce(sum(${schema.goalContributions.amount}), 0)`,
      })
      .from(schema.goalContributions)
      .innerJoin(schema.goals, eq(schema.goalContributions.goalId, schema.goals.id))
      .where(
        and(
          eq(schema.goals.userId, user.id),
          gte(schema.goalContributions.contributedAt, new Date(startStr)),
          lte(schema.goalContributions.contributedAt, new Date(endStr + "T23:59:59.999Z")),
        ),
      );
    const goalContributionsMonthPaise = Number(goalContribRows[0]?.total ?? 0);

    const emergencyFundRecord = await db.query.emergencyFunds.findFirst({
      where: eq(schema.emergencyFunds.userId, user.id),
    });
    const emergencyFundCurrentPaise = emergencyFundRecord?.currentAmount ?? 0;

    // Approximate category mapping to allocation buckets:
    // Essentials: Bills + Transport + 50% Food
    // Enjoyment: Shopping + Entertainment + 50% Food
    const essentialsSpent =
      (spentByCategory["Bills"] || 0) +
      (spentByCategory["Transport"] || 0) +
      Math.round((spentByCategory["Food"] || 0) * 0.5);

    const enjoymentSpent =
      (spentByCategory["Shopping"] || 0) +
      (spentByCategory["Entertainment"] || 0) +
      Math.round((spentByCategory["Food"] || 0) * 0.5);

    // Standard financial planning priority ordering
    const ALLOCATION_ORDER: Record<string, number> = {
      essentials: 1,
      enjoyment: 2,
      buffer: 3,
      emergency: 4,
      future_savings: 5,
      long_term_wealth: 6,
    };

    const sortedAllocations = [...allocations].sort(
      (a, b) =>
        (ALLOCATION_ORDER[a.key] ?? 99) - (ALLOCATION_ORDER[b.key] ?? 99),
    );

    const overview = sortedAllocations.map((a) => {
      let spent = 0;
      let status: "goal" | undefined = undefined;

      if (a.key === "essentials") {
        spent = essentialsSpent;
      } else if (a.key === "enjoyment") {
        spent = enjoymentSpent;
      } else if (a.key === "buffer") {
        spent = spentByCategory["Others"] || 0;
      } else if (a.key === "future_savings") {
        spent = goalContributionsMonthPaise;
        status = "goal";
      } else if (a.key === "emergency") {
        spent = Math.min(a.amount, emergencyFundCurrentPaise);
        status = "goal";
      } else if (a.key === "long_term_wealth") {
        spent = 0;
        status = "goal";
      }

      return {
        label: ALLOCATION_LABELS[a.key as keyof typeof ALLOCATION_LABELS] ?? a.key,
        amount: Math.round(spent / 100),
        of: Math.round(a.amount / 100),
        colorClass: ALLOCATION_COLORS[a.key as keyof typeof ALLOCATION_COLORS] ?? "bg-primary",
        status,
      };
    });

    let insightText = "You're on track with your spending plan.";
    let insightTone: "positive" | "warning" | "info" = "info";

    if (monthBudget > 0) {
      if (isOverDailyBudget) {
        insightText = `You've spent ₹${todaySpentRupees.toLocaleString("en-IN")} today (₹${overspentAmount.toLocaleString("en-IN")} above your daily limit). Safe daily allowance adjusted to ₹${baselineDailyRate}/day for upcoming days.`;
        insightTone = "warning";
      } else if (monthSpent < netSpendableBudgetPaise * 0.7) {
        insightText = `You're ₹${Math.round(
          (netSpendableBudgetPaise - monthSpent) / 100,
        ).toLocaleString("en-IN")} ahead of your spending plan. Great job!`;
        insightTone = "positive";
      } else if (monthSpent > netSpendableBudgetPaise) {
        insightText = `You've exceeded your monthly discretionary budget by ₹${Math.round(
          (monthSpent - netSpendableBudgetPaise) / 100,
        ).toLocaleString("en-IN")}. Consider trimming non-essential expenses to protect your goals.`;
        insightTone = "warning";
      }
    }

    let safeToSpendSubtitle = "Safe daily limit for today";
    const goalsNote = totalGoalsMonthlyTargetRupees > 0
      ? ` • ₹${totalGoalsMonthlyTargetRupees.toLocaleString("en-IN")}/mo saved in goals`
      : "";

    if (monthBudget <= 0) {
      safeToSpendSubtitle = "Set income in Profile to activate Safe-to-Spend";
    } else if (isOverDailyBudget) {
      safeToSpendSubtitle = `Exceeded today by ₹${overspentAmount.toLocaleString("en-IN")} (${todaySpentRupees.toLocaleString("en-IN")} spent of ₹${todayDesignatedRupees.toLocaleString("en-IN")})${goalsNote}`;
    } else if (todaySpentRupees > 0) {
      safeToSpendSubtitle = `₹${todaySpentRupees.toLocaleString("en-IN")} spent of ₹${todayDesignatedRupees.toLocaleString("en-IN")} daily quota${goalsNote}`;
    } else {
      safeToSpendSubtitle = `Full ₹${todayDesignatedRupees.toLocaleString("en-IN")} daily quota available today${goalsNote}`;
    }

    return NextResponse.json({
      greetingName: user.name?.split(" ")[0] || "Friend",
      safeToSpendToday: todayRemainingRupees,
      safeToSpendSubtitle,
      todaySpent: todaySpentRupees,
      todayDesignated: todayDesignatedRupees,
      todayRemaining: todayRemainingRupees,
      baselineDaily: baselineDailyRate,
      isOverDailyBudget,
      overspentAmount,
      newDailySafeToSpend: baselineDailyRate,
      monthSpent: Math.round(monthSpent / 100),
      monthBudget: Math.round(monthBudget / 100),
      committedGoalsMonthly: totalGoalsMonthlyTargetRupees,
      discretionaryBudget: Math.round(netSpendableBudgetPaise / 100),
      overview,
      topGoal,
      insight: { text: insightText, tone: insightTone },
    });
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    return NextResponse.json({
      greetingName: user.name?.split(" ")[0] || "Friend",
      safeToSpendToday: 0,
      safeToSpendSubtitle: "Set income in Profile to activate Safe-to-Spend",
      todaySpent: 0,
      todayDesignated: 0,
      todayRemaining: 0,
      baselineDaily: 0,
      isOverDailyBudget: false,
      overspentAmount: 0,
      newDailySafeToSpend: 0,
      monthSpent: 0,
      monthBudget: 0,
      committedGoalsMonthly: 0,
      discretionaryBudget: 0,
      overview: [],
      topGoal: null,
      insight: {
        text: "Set up your financial profile to receive personalized daily recommendations.",
        tone: "info",
      },
    });
  }
}
