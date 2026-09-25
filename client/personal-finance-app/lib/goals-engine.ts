import { db, schema } from "@/lib/db";
import { eq, and, gte, lte, desc, like } from "drizzle-orm";

export interface GoalCapacityInfo {
  hasIncome: boolean;
  monthlyIncomePaise: number;
  monthlyIncomeRupees: number;
  savingsPercent: number;
  essentialsPercent: number;
  maxAllowedMonthlyPaise: number;
  maxAllowedMonthlyRupees: number;
  recommendedMonthlyPaise: number;
  recommendedMonthlyRupees: number;
  existingMonthlyCommitmentPaise: number;
  existingMonthlyCommitmentRupees: number;
  remainingMonthlyCapacityPaise: number;
  remainingMonthlyCapacityRupees: number;
  activeGoalsCount: number;
  maxGoalsCount: number;
  canCreateGoal: boolean;
  restrictionReason?: string;
}

export interface GoalRebalanceRecommendation {
  goalId: string;
  goalName: string;
  icon: string;
  targetAmountRupees: number;
  currentAmountRupees: number;
  remainingAmountRupees: number;
  currentMonthlyTargetRupees: number;
  suggestedMonthlyTargetRupees: number;
  deltaMonthlyTargetRupees: number; // suggested - current
  currentMonthsToTarget: number;
  suggestedMonthsToTarget: number;
  reason: string;
}

export interface RebalancePlan {
  monthlyIncomeRupees: number;
  currentTotalMonthlyCommitmentRupees: number;
  recommendedTotalMonthlyCommitmentRupees: number;
  monthlySavingsFreedRupees: number;
  dailySafeToSpendGainRupees: number;
  isOverAllocated: boolean;
  pressureLevel: "HIGH" | "MODERATE" | "OPTIMAL";
  aiExplanation: string;
  recommendations: GoalRebalanceRecommendation[];
}

export const MAX_ACTIVE_GOALS = 5;
// Maximum percentage of income allowed across all goals to protect daily life essentials + buffer
export const MAX_GOALS_SAVINGS_PERCENT_CEILING = 35;

/**
 * Returns the user's financial capacity for setting up monthly goals.
 * Protects essential living expenses (ration, rent, bills, daily food)
 * by preventing unrealistic and excessive goal allocations.
 */
export async function getGoalLimitsAndCapacity(
  userId: string,
): Promise<GoalCapacityInfo> {
  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, userId),
  });

  const monthlyIncomePaise = profile?.monthlyIncome ?? 0;
  const monthlyIncomeRupees = Math.round(monthlyIncomePaise / 100);
  const savingsPercent = profile?.savingsPercent ?? 20;
  const essentialsPercent = profile?.essentialsPercent ?? 50;

  const allUserGoals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId));

  const trulyActiveGoals = allUserGoals.filter(
    (g) => g.status === "on_track" || g.status === "at_risk",
  );

  const existingMonthlyCommitmentPaise = trulyActiveGoals.reduce(
    (sum, g) => sum + (g.monthlyTarget || 0),
    0,
  );
  const existingMonthlyCommitmentRupees = Math.round(
    existingMonthlyCommitmentPaise / 100,
  );

  if (!profile || monthlyIncomePaise <= 0) {
    return {
      hasIncome: false,
      monthlyIncomePaise: 0,
      monthlyIncomeRupees: 0,
      savingsPercent,
      essentialsPercent,
      maxAllowedMonthlyPaise: 0,
      maxAllowedMonthlyRupees: 0,
      recommendedMonthlyPaise: 0,
      recommendedMonthlyRupees: 0,
      existingMonthlyCommitmentPaise,
      existingMonthlyCommitmentRupees,
      remainingMonthlyCapacityPaise: 0,
      remainingMonthlyCapacityRupees: 0,
      activeGoalsCount: trulyActiveGoals.length,
      maxGoalsCount: MAX_ACTIVE_GOALS,
      canCreateGoal: false,
      restrictionReason:
        "Please set your monthly income in Profile first before creating savings goals.",
    };
  }

  // Safe ceiling calculation:
  // Must leave at least essentials% + 15% discretionary/buffer for daily survival
  const maxSafePercent = Math.min(
    MAX_GOALS_SAVINGS_PERCENT_CEILING,
    Math.max(10, 100 - essentialsPercent - 15),
  );

  const maxAllowedMonthlyPaise = Math.round(
    (monthlyIncomePaise * maxSafePercent) / 100,
  );
  const maxAllowedMonthlyRupees = Math.round(maxAllowedMonthlyPaise / 100);

  const recommendedMonthlyPaise = Math.round(
    (monthlyIncomePaise * savingsPercent) / 100,
  );
  const recommendedMonthlyRupees = Math.round(recommendedMonthlyPaise / 100);

  const remainingMonthlyCapacityPaise = Math.max(
    0,
    maxAllowedMonthlyPaise - existingMonthlyCommitmentPaise,
  );
  const remainingMonthlyCapacityRupees = Math.round(
    remainingMonthlyCapacityPaise / 100,
  );

  const activeGoalsCount = trulyActiveGoals.length;
  let canCreateGoal = true;
  let restrictionReason: string | undefined = undefined;

  if (activeGoalsCount >= MAX_ACTIVE_GOALS) {
    canCreateGoal = false;
    restrictionReason = `Maximum limit of ${MAX_ACTIVE_GOALS} active goals reached. Please complete or delete a goal before adding a new one.`;
  } else if (remainingMonthlyCapacityPaise <= 0) {
    canCreateGoal = false;
    restrictionReason = `You have reached your safe monthly savings limit of ₹${maxAllowedMonthlyRupees.toLocaleString("en-IN")}/mo. Allocating more will compromise your daily living expenses.`;
  }

  return {
    hasIncome: true,
    monthlyIncomePaise,
    monthlyIncomeRupees,
    savingsPercent,
    essentialsPercent,
    maxAllowedMonthlyPaise,
    maxAllowedMonthlyRupees,
    recommendedMonthlyPaise,
    recommendedMonthlyRupees,
    existingMonthlyCommitmentPaise,
    existingMonthlyCommitmentRupees,
    remainingMonthlyCapacityPaise,
    remainingMonthlyCapacityRupees,
    activeGoalsCount,
    maxGoalsCount: MAX_ACTIVE_GOALS,
    canCreateGoal,
    restrictionReason,
  };
}

/**
 * Validates whether a new or updated monthly goal target is within the safe limits.
 */
export async function validateGoalTarget({
  userId,
  targetAmountPaise,
  monthlyTargetPaise,
  excludeGoalId,
}: {
  userId: string;
  targetAmountPaise: number;
  monthlyTargetPaise: number;
  excludeGoalId?: string;
}): Promise<{ valid: boolean; error?: string }> {
  if (targetAmountPaise <= 0) {
    return { valid: false, error: "Target amount must be greater than 0" };
  }

  if (monthlyTargetPaise > targetAmountPaise) {
    return {
      valid: false,
      error: "Monthly target cannot be greater than the goal's total target amount",
    };
  }

  const capacity = await getGoalLimitsAndCapacity(userId);

  if (!capacity.hasIncome) {
    return {
      valid: false,
      error:
        "Please set up your monthly income in your Profile before creating monthly goals.",
    };
  }

  // If creating new goal and count exceeds
  if (!excludeGoalId && capacity.activeGoalsCount >= capacity.maxGoalsCount) {
    return {
      valid: false,
      error: `You already have ${capacity.maxGoalsCount} active goals. Focus on completing existing goals first to avoid spreading your savings too thin.`,
    };
  }

  // Calculate adjusted existing commitments if editing an existing goal
  let existingCommitmentPaise = capacity.existingMonthlyCommitmentPaise;
  if (excludeGoalId) {
    const existing = await db.query.goals.findFirst({
      where: and(
        eq(schema.goals.id, excludeGoalId),
        eq(schema.goals.userId, userId),
      ),
    });
    if (existing) {
      existingCommitmentPaise = Math.max(
        0,
        existingCommitmentPaise - (existing.monthlyTarget || 0),
      );
    }
  }

  const projectedTotalCommitmentPaise =
    existingCommitmentPaise + monthlyTargetPaise;

  if (projectedTotalCommitmentPaise > capacity.maxAllowedMonthlyPaise) {
    const allowedForThisGoalRupees = Math.max(
      0,
      Math.round(
        (capacity.maxAllowedMonthlyPaise - existingCommitmentPaise) / 100,
      ),
    );
    return {
      valid: false,
      error: `Monthly target of ₹${Math.round(
        monthlyTargetPaise / 100,
      ).toLocaleString(
        "en-IN",
      )}/mo exceeds your safe monthly savings capacity (₹${allowedForThisGoalRupees.toLocaleString(
        "en-IN",
      )} available). Going higher leaves insufficient money for your daily life essentials!`,
    };
  }

  return { valid: true };
}

/**
 * Automates monthly allocation into active goals:
 * Runs once per calendar month for each active goal with monthlyTarget > 0.
 * Automatically inserts into goal_contributions and updates goal's currentAmount.
 */
export async function processMonthlyGoalAutoAllocations(userId: string): Promise<{
  allocatedCount: number;
  totalAllocatedPaise: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthTag = `[AUTO_MONTHLY] ${year}-${pad(month)}`;
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Fetch active goals with a positive monthly target
  const activeGoals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId));

  let allocatedCount = 0;
  let totalAllocatedPaise = 0;

  for (const goal of activeGoals) {
    if (goal.status === "completed" || !goal.monthlyTarget || goal.monthlyTarget <= 0) {
      continue;
    }

    // Check if auto-allocation has already been executed for this goal this month
    const existingAutoAlloc = await db
      .select({ id: schema.goalContributions.id })
      .from(schema.goalContributions)
      .where(
        and(
          eq(schema.goalContributions.goalId, goal.id),
          gte(schema.goalContributions.contributedAt, startOfMonth),
          lte(schema.goalContributions.contributedAt, endOfMonth),
          like(schema.goalContributions.note, `${monthTag}%`),
        ),
      )
      .limit(1);

    if (existingAutoAlloc.length > 0) {
      // Already allocated for this month
      continue;
    }

    // Auto-allocate: Calculate amount to contribute (do not overshoot target)
    const neededPaise = Math.max(0, goal.targetAmount - goal.currentAmount);
    const amountToContributePaise = Math.min(goal.monthlyTarget, neededPaise);

    if (amountToContributePaise <= 0) {
      // Target already achieved, mark completed
      await db
        .update(schema.goals)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(schema.goals.id, goal.id));
      continue;
    }

    const newCurrentAmount = goal.currentAmount + amountToContributePaise;
    const isNowCompleted = newCurrentAmount >= goal.targetAmount;

    // 1. Record contribution in ledger
    await db.insert(schema.goalContributions).values({
      goalId: goal.id,
      amount: amountToContributePaise,
      note: `${monthTag} - Automated Monthly Savings Allocation (${monthName} ${year})`,
      contributedAt: new Date(),
    });

    // 2. Update goal balance
    await db
      .update(schema.goals)
      .set({
        currentAmount: newCurrentAmount,
        status: isNowCompleted ? "completed" : "on_track",
        updatedAt: new Date(),
      })
      .where(eq(schema.goals.id, goal.id));

    // 3. Notify user of the automated milestone allocation
    await db.insert(schema.notifications).values({
      userId,
      type: "goal_allocated",
      title: "🎯 Monthly Goal Auto-Allocated",
      body: `₹${Math.round(
        amountToContributePaise / 100,
      ).toLocaleString("en-IN")} was automatically allocated to your goal "${
        goal.name
      }" for ${monthName} ${year}.`,
      read: false,
    });

    allocatedCount++;
    totalAllocatedPaise += amountToContributePaise;
  }

  return { allocatedCount, totalAllocatedPaise };
}

/**
 * AI-driven Goal Allocation Rebalancer:
 * Evaluates all user goals against monthly income, essentials, and deadlines.
 * Suggests safe, optimized monthly targets for each goal to ensure:
 * 1. Daily Safe-to-Spend is NOT starved.
 * 2. Short-term quick milestones (e.g. AC, phone) finish rapidly.
 * 3. Long-term large targets (e.g. Car, Home) are funded sustainably without choking daily life.
 */
export async function calculateAiGoalRecommendations(
  userId: string,
): Promise<RebalancePlan> {
  const profile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, userId),
  });

  const monthlyIncomePaise = profile?.monthlyIncome ?? 0;
  const monthlyIncomeRupees = Math.round(monthlyIncomePaise / 100);
  const savingsPercent = profile?.savingsPercent ?? 20;

  const allGoals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId))
    .orderBy(desc(schema.goals.createdAt));

  const activeGoals = allGoals.filter(
    (g) => g.status === "on_track" || g.status === "at_risk",
  );

  const currentTotalMonthlyCommitmentRupees = activeGoals.reduce(
    (sum, g) => sum + Math.round((g.monthlyTarget || 0) / 100),
    0,
  );

  // Safe ceiling: 20-30% of income for savings
  const safeMonthlySavingsRupees = Math.max(
    1000,
    Math.round((monthlyIncomeRupees * Math.min(savingsPercent, 30)) / 100),
  );
  const hardCeilingRupees = Math.round(
    (monthlyIncomeRupees * MAX_GOALS_SAVINGS_PERCENT_CEILING) / 100,
  );

  if (activeGoals.length === 0) {
    return {
      monthlyIncomeRupees,
      currentTotalMonthlyCommitmentRupees: 0,
      recommendedTotalMonthlyCommitmentRupees: 0,
      monthlySavingsFreedRupees: 0,
      dailySafeToSpendGainRupees: 0,
      isOverAllocated: false,
      pressureLevel: "OPTIMAL",
      aiExplanation: "You currently have no active savings goals to rebalance.",
      recommendations: [],
    };
  }

  const isOverAllocated =
    currentTotalMonthlyCommitmentRupees > safeMonthlySavingsRupees;

  const pressureLevel: "HIGH" | "MODERATE" | "OPTIMAL" =
    currentTotalMonthlyCommitmentRupees > hardCeilingRupees
      ? "HIGH"
      : isOverAllocated
      ? "MODERATE"
      : "OPTIMAL";

  // Rebalance pool target:
  // If over-allocated, bring total down to safe envelope.
  // If under-allocated, maintain sustainable total.
  const targetBudgetRupees = isOverAllocated
    ? safeMonthlySavingsRupees
    : Math.max(currentTotalMonthlyCommitmentRupees, safeMonthlySavingsRupees);

  // Calculate weighted priorities for each goal
  const goalWeights = activeGoals.map((g) => {
    const currentRupees = Math.round(g.currentAmount / 100);
    const targetRupees = Math.round(g.targetAmount / 100);
    const remainingRupees = Math.max(0, targetRupees - currentRupees);

    // Horizon Weighting:
    // Quick-win goals (under 50k) should finish quickly to build momentum.
    // Huge goals (over 2L, like cars) shouldn't monopolize daily income.
    let horizonWeight = 1.0;
    if (remainingRupees <= 40000) {
      horizonWeight = 1.6; // High priority quick-win
    } else if (remainingRupees <= 150000) {
      horizonWeight = 1.2; // Medium priority
    } else {
      horizonWeight = 0.8; // Sustainable long-term SIP pacing
    }

    // Urgency / Deadline Weighting
    let urgencyMultiplier = 1.0;
    if (g.deadline) {
      const daysUntil = Math.max(
        1,
        Math.round(
          (new Date(g.deadline).getTime() - Date.now()) / (1000 * 3600 * 24),
        ),
      );
      const monthsUntil = Math.max(1, Math.round(daysUntil / 30));
      if (monthsUntil <= 6) urgencyMultiplier = 1.5;
      else if (monthsUntil <= 12) urgencyMultiplier = 1.25;
    }

    const finalWeight = horizonWeight * urgencyMultiplier;
    return { goal: g, remainingRupees, currentRupees, targetRupees, finalWeight };
  });

  const totalWeight = goalWeights.reduce((s, item) => s + item.finalWeight, 0) || 1;

  // Allocate target budget across goals based on normalized weight
  const recommendations: GoalRebalanceRecommendation[] = goalWeights.map(
    (item) => {
      const g = item.goal;
      const currentMonthlyTargetRupees = Math.round((g.monthlyTarget || 0) / 100);
      const rawAllocation = (item.finalWeight / totalWeight) * targetBudgetRupees;

      // Snap to neat multiples of 100 for clean human readability
      let suggestedMonthlyTargetRupees = Math.max(
        500,
        Math.round(rawAllocation / 100) * 100,
      );

      // Don't overshoot total remaining
      if (item.remainingRupees > 0 && suggestedMonthlyTargetRupees > item.remainingRupees) {
        suggestedMonthlyTargetRupees = item.remainingRupees;
      }

      const deltaMonthlyTargetRupees =
        suggestedMonthlyTargetRupees - currentMonthlyTargetRupees;

      const currentMonthsToTarget =
        currentMonthlyTargetRupees > 0
          ? Math.ceil(item.remainingRupees / currentMonthlyTargetRupees)
          : 999;
      const suggestedMonthsToTarget =
        suggestedMonthlyTargetRupees > 0
          ? Math.ceil(item.remainingRupees / suggestedMonthlyTargetRupees)
          : 999;

      let reason = "Optimal allocation maintained for steady progress.";
      if (deltaMonthlyTargetRupees < -500) {
        reason = `Reduced by ₹${Math.abs(
          deltaMonthlyTargetRupees,
        ).toLocaleString(
          "en-IN",
        )}/mo. Large long-term goals should be funded steadily without choking your daily living expenses (food, bills, transport).`;
      } else if (deltaMonthlyTargetRupees > 500) {
        reason = `Increased by ₹${deltaMonthlyTargetRupees.toLocaleString(
          "en-IN",
        )}/mo. Reaches milestone in ${suggestedMonthsToTarget} months (faster by ${Math.max(
          1,
          currentMonthsToTarget - suggestedMonthsToTarget,
        )} months!).`;
      } else if (item.remainingRupees <= 30000) {
        reason = `Prioritized for rapid milestone completion in ~${suggestedMonthsToTarget} months.`;
      }

      return {
        goalId: g.id,
        goalName: g.name,
        icon: g.icon,
        targetAmountRupees: item.targetRupees,
        currentAmountRupees: item.currentRupees,
        remainingAmountRupees: item.remainingRupees,
        currentMonthlyTargetRupees,
        suggestedMonthlyTargetRupees,
        deltaMonthlyTargetRupees,
        currentMonthsToTarget,
        suggestedMonthsToTarget,
        reason,
      };
    },
  );

  const recommendedTotalMonthlyCommitmentRupees = recommendations.reduce(
    (sum, r) => sum + r.suggestedMonthlyTargetRupees,
    0,
  );

  const monthlySavingsFreedRupees = Math.max(
    0,
    currentTotalMonthlyCommitmentRupees - recommendedTotalMonthlyCommitmentRupees,
  );
  const dailySafeToSpendGainRupees = Math.round(monthlySavingsFreedRupees / 30);

  let aiExplanation = "";
  if (isOverAllocated) {
    aiExplanation = `You have committed ₹${currentTotalMonthlyCommitmentRupees.toLocaleString(
      "en-IN",
    )}/mo across ${activeGoals.length} goals, which exceeds your recommended savings envelope (₹${safeMonthlySavingsRupees.toLocaleString(
      "en-IN",
    )}/mo). Rebalancing as suggested frees up ₹${monthlySavingsFreedRupees.toLocaleString(
      "en-IN",
    )}/month, giving you +₹${dailySafeToSpendGainRupees}/day in extra daily Safe-to-Spend for food, bills, and everyday lifestyle without failing your milestones.`;
  } else {
    aiExplanation = `Your goal allocations are well-paced. Rebalancing helps balance short-term milestone achievements with sustainable long-term wealth building while protecting your daily Safe-to-Spend.`;
  }

  return {
    monthlyIncomeRupees,
    currentTotalMonthlyCommitmentRupees,
    recommendedTotalMonthlyCommitmentRupees,
    monthlySavingsFreedRupees,
    dailySafeToSpendGainRupees,
    isOverAllocated,
    pressureLevel,
    aiExplanation,
    recommendations,
  };
}

/**
 * Applies the AI recommended or user-adjusted allocations directly to all active goals.
 */
export async function applyRebalancePlan(
  userId: string,
  allocations: { goalId: string; monthlyTargetRupees: number }[],
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  for (const alloc of allocations) {
    const monthlyTargetPaise = Math.max(0, Math.round(alloc.monthlyTargetRupees * 100));

    const [updated] = await db
      .update(schema.goals)
      .set({
        monthlyTarget: monthlyTargetPaise,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.goals.id, alloc.goalId),
          eq(schema.goals.userId, userId),
        ),
      )
      .returning();

    if (updated) {
      updatedCount++;
    }
  }

  // Create notification confirming the rebalancing
  if (updatedCount > 0) {
    await db.insert(schema.notifications).values({
      userId,
      type: "goals_rebalanced",
      title: "⚡ Goals Successfully Rebalanced by AI",
      body: `Your monthly goal allocations were rebalanced to protect your daily Safe-to-Spend and optimize completion timelines.`,
      read: false,
    });
  }

  return { updatedCount };
}
