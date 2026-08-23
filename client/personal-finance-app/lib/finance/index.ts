import { calculateEmergencyFundProgress } from "@/lib/emergency-fund";
import { calculateGoalProgress } from "@/lib/goals";
import {
  calculatePlanVsActual,
  sumSpendingByBucket,
  sumSpendingByCategory,
  type PlanAllocation,
  type SpendingTransaction,
} from "./plan-vs-actual";
import { calculateSafeToSpend } from "./safe-to-spend";
import { percentage, sumAmounts } from "./calculations";

export const LIMIT_NEAR_THRESHOLD_PERCENT = 85;

type Warning =
  | {
      type: "LIMIT_CROSSED";
      resourceId: string;
      category: SpendingTransaction["category"];
      amountOver: number;
    }
  | {
      type: "LIMIT_NEAR";
      resourceId: string;
      category: SpendingTransaction["category"];
      remainingAmount: number;
    }
  | {
      type: "EMERGENCY_FUND_BELOW_TARGET";
      remainingAmount: number;
    }
  | {
      type: "PLAN_ALLOCATION_EXCEEDED";
      allocationKey: PlanAllocation["key"];
      amountOver: number | null;
    };

type ProfileInput = {
  monthlyIncome: number;
  currency: string;
} | null;

type PlanInput = {
  id: string;
  month: number;
  year: number;
  monthlyIncome: number;
  status: "draft" | "recommended" | "active";
  whyThisPlan: string | null;
  allocations: readonly PlanAllocation[];
} | null;

type GoalInput = {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  monthlyTarget: number;
  status: "on_track" | "at_risk" | "completed";
  contributions: readonly { amount: number }[];
};

type LimitInput = {
  id: string;
  category: SpendingTransaction["category"];
  monthlyLimit: number;
};

type EmergencyFundInput = {
  targetAmount: number;
  currentAmount: number;
} | null;

export type FinancialSnapshotInput = {
  profile: ProfileInput;
  activePlan: PlanInput;
  transactions: readonly SpendingTransaction[];
  goals: readonly GoalInput[];
  limits: readonly LimitInput[];
  emergencyFund: EmergencyFundInput;
  asOfDate: Date;
};

export function calculateFinancialSnapshot(input: FinancialSnapshotInput) {
  const actualSpending = sumSpendingByCategory(input.transactions);
  const actualBucketSpending = sumSpendingByBucket(input.transactions);
  const actualSpent = sumAmounts(Object.values(actualSpending));
  const unknownTransactionAmount = sumAmounts(
    input.transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && transaction.financialBucket === "unknown",
      )
      .map((transaction) => transaction.amount),
  );
  const unknownTransactionCount = input.transactions.filter(
    (transaction) => transaction.financialBucket === "unknown",
  ).length;
  const actualIncome = sumAmounts(
    input.transactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => transaction.amount),
  );

  const planVsActual = input.activePlan
    ? calculatePlanVsActual(
        input.activePlan.allocations,
        input.transactions,
      )
    : [];

  const safeToSpend = input.activePlan
    ? calculateSafeToSpend({
        monthlyIncome: input.activePlan.monthlyIncome,
        planMonth: input.activePlan.month,
        planYear: input.activePlan.year,
        allocations: input.activePlan.allocations,
        transactions: input.transactions,
        asOfDate: input.asOfDate,
      })
    : null;

  const goals = input.goals.map((goal) => ({
    ...goal,
    ...calculateGoalProgress(goal.targetAmount, goal.contributions),
  }));

  const limitUtilization = input.limits.map((limit) => {
    const actualAmount = actualSpending[limit.category];
    const utilizationPercent = percentage(actualAmount, limit.monthlyLimit);
    return {
      ...limit,
      actualAmount,
      remainingAmount: Math.max(limit.monthlyLimit - actualAmount, 0),
      utilizationPercent,
      exceeded: actualAmount >= limit.monthlyLimit,
    };
  });

  const emergencyFund = input.emergencyFund
    ? {
        ...input.emergencyFund,
        ...calculateEmergencyFundProgress(
          input.emergencyFund.targetAmount,
          input.emergencyFund.currentAmount,
        ),
        funded: input.emergencyFund.currentAmount >= input.emergencyFund.targetAmount,
      }
    : null;

  const warnings: Warning[] = [];
  for (const limit of limitUtilization) {
      if (limit.exceeded) {
        warnings.push({
          type: "LIMIT_CROSSED" as const,
          resourceId: limit.id,
          category: limit.category,
          amountOver: Math.max(limit.actualAmount - limit.monthlyLimit, 0),
        });
        continue;
      }
      if (
        BigInt(limit.actualAmount) * BigInt(100) >=
        BigInt(limit.monthlyLimit) * BigInt(LIMIT_NEAR_THRESHOLD_PERCENT)
      ) {
        warnings.push({
          type: "LIMIT_NEAR" as const,
          resourceId: limit.id,
          category: limit.category,
          remainingAmount: limit.remainingAmount,
        });
      }
  }
  if (emergencyFund && !emergencyFund.funded) {
    warnings.push({
      type: "EMERGENCY_FUND_BELOW_TARGET",
      remainingAmount: emergencyFund.remainingAmount,
    });
  }
  for (const comparison of planVsActual) {
    if (comparison.status === "OVER") {
      warnings.push({
        type: "PLAN_ALLOCATION_EXCEEDED",
        allocationKey: comparison.allocationKey,
        amountOver: comparison.varianceAmount,
      });
    }
  }

  return {
    income: {
      monthlyPlanned: input.profile?.monthlyIncome ?? input.activePlan?.monthlyIncome ?? 0,
      planMonthly: input.activePlan?.monthlyIncome ?? null,
      actualIncome,
      currency: input.profile?.currency ?? "INR",
    },
    spending: {
      actualSpent,
      byCategory: actualSpending,
      byBucket: actualBucketSpending,
      actualSavings:
        sumAmounts([
          actualBucketSpending.future_savings,
          actualBucketSpending.long_term_wealth,
        ]),
      unknownTransactionAmount,
      unknownTransactionCount,
    },
    plan: input.activePlan
      ? {
          ...input.activePlan,
          allocations: input.activePlan.allocations,
        }
      : null,
    planVsActual,
    safeToSpend,
    goals,
    limits: limitUtilization,
    emergencyFund,
    warnings,
  };
}

export * from "./calculations";
export * from "./plan-vs-actual";
export * from "./safe-to-spend";
