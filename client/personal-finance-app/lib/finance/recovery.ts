import type { calculateFinancialSnapshot } from "./index";
import { percentage } from "./calculations";

export const RECOVERY_LIMIT_NEAR_THRESHOLD_PERCENT = 85;
export const RECOVERY_MATERIAL_OVERAGE_PERCENT = 25;

type FinancialSnapshot = ReturnType<typeof calculateFinancialSnapshot>;

type RecoverySeverity = "critical" | "high" | "medium" | "low";

type RecoveryIssue = {
  code:
    | "LIMIT_CROSSED"
    | "LIMIT_NEAR"
    | "PLAN_ALLOCATION_EXCEEDED"
    | "EMERGENCY_FUND_BELOW_TARGET"
    | "SAFE_TO_SPEND_ZERO";
  severity: RecoverySeverity;
  facts: Record<string, number | string | null>;
};

type RecoveryOption = {
  code:
    | "REVIEW_CATEGORY_SPENDING"
    | "REVIEW_ENJOYMENT_ALLOCATION"
    | "DIRECT_AVAILABLE_MONEY_TO_EMERGENCY_FUND"
    | "REVIEW_NON_ESSENTIAL_SPENDING";
  issueCodes: RecoveryIssue["code"][];
  estimatedAmount: number | null;
  supportsGoal: string;
  safeWithProtectedEssentials: boolean;
};

export type RecoveryResult = {
  issues: RecoveryIssue[];
  options: RecoveryOption[];
  limitations: string[];
};

function severityForLimit(limit: {
  actualAmount: number;
  monthlyLimit: number;
  exceeded: boolean;
}): RecoverySeverity {
  if (!limit.exceeded) return "low";
  const overagePercent = percentage(
    Math.max(limit.actualAmount - limit.monthlyLimit, 0),
    limit.monthlyLimit,
  );
  return overagePercent >= RECOVERY_MATERIAL_OVERAGE_PERCENT ? "high" : "medium";
}

export function calculateRecovery(snapshot: FinancialSnapshot): RecoveryResult {
  const issues: RecoveryIssue[] = [];
  const options: RecoveryOption[] = [];
  const limitations: string[] = [];

  for (const limit of snapshot.limits) {
    if (limit.exceeded) {
      issues.push({
        code: "LIMIT_CROSSED",
        severity: severityForLimit(limit),
        facts: {
          resourceId: limit.id,
          category: limit.category,
          limitAmount: limit.monthlyLimit,
          actualAmount: limit.actualAmount,
          amountOver: Math.max(limit.actualAmount - limit.monthlyLimit, 0),
        },
      });
      options.push({
        code: "REVIEW_CATEGORY_SPENDING",
        issueCodes: ["LIMIT_CROSSED"],
        estimatedAmount: Math.max(limit.actualAmount - limit.monthlyLimit, 0),
        supportsGoal: "stay within the user-defined category limit",
        safeWithProtectedEssentials: true,
      });
    } else if (
      BigInt(limit.actualAmount) * BigInt(100) >=
      BigInt(limit.monthlyLimit) * BigInt(RECOVERY_LIMIT_NEAR_THRESHOLD_PERCENT)
    ) {
      issues.push({
        code: "LIMIT_NEAR",
        severity: "low",
        facts: {
          resourceId: limit.id,
          category: limit.category,
          limitAmount: limit.monthlyLimit,
          actualAmount: limit.actualAmount,
          remainingAmount: limit.remainingAmount,
        },
      });
      options.push({
        code: "REVIEW_CATEGORY_SPENDING",
        issueCodes: ["LIMIT_NEAR"],
        estimatedAmount: limit.remainingAmount,
        supportsGoal: "keep the user-defined category limit available",
        safeWithProtectedEssentials: true,
      });
    }
  }

  for (const comparison of snapshot.planVsActual) {
    if (comparison.status === "OVER") {
      issues.push({
        code: "PLAN_ALLOCATION_EXCEEDED",
        severity: "medium",
        facts: {
          allocationKey: comparison.allocationKey,
          plannedAmount: comparison.plannedAmount,
          actualAmount: comparison.actualAmount,
          amountOver: comparison.varianceAmount,
        },
      });
      if (comparison.allocationKey === "enjoyment") {
        options.push({
          code: "REVIEW_ENJOYMENT_ALLOCATION",
          issueCodes: ["PLAN_ALLOCATION_EXCEEDED"],
          estimatedAmount: comparison.varianceAmount,
          supportsGoal: "restore the enjoyment allocation to its planned amount",
          safeWithProtectedEssentials: true,
        });
      }
    }
  }

  if (snapshot.emergencyFund && !snapshot.emergencyFund.funded) {
    issues.push({
      code: "EMERGENCY_FUND_BELOW_TARGET",
      severity: snapshot.safeToSpend?.safeToSpend === 0 ? "high" : "medium",
      facts: {
        targetAmount: snapshot.emergencyFund.targetAmount,
        currentAmount: snapshot.emergencyFund.currentAmount,
        remainingAmount: snapshot.emergencyFund.remainingAmount,
      },
    });
    options.push({
      code: "DIRECT_AVAILABLE_MONEY_TO_EMERGENCY_FUND",
      issueCodes: ["EMERGENCY_FUND_BELOW_TARGET"],
      estimatedAmount: snapshot.safeToSpend?.availableDiscretionary ?? null,
      supportsGoal: "fund the emergency reserve",
      safeWithProtectedEssentials: true,
    });
  }

  if (snapshot.safeToSpend && snapshot.safeToSpend.safeToSpend <= 0) {
    issues.push({
      code: "SAFE_TO_SPEND_ZERO",
      severity: snapshot.safeToSpend.actualSpent >= snapshot.safeToSpend.remainingIncome
        ? "high"
        : "medium",
      facts: {
        safeToSpend: snapshot.safeToSpend.safeToSpend,
        actualSpent: snapshot.safeToSpend.actualSpent,
        remainingIncome: snapshot.safeToSpend.remainingIncome,
        availableDiscretionary: snapshot.safeToSpend.availableDiscretionary,
      },
    });
    options.push({
      code: "REVIEW_NON_ESSENTIAL_SPENDING",
      issueCodes: ["SAFE_TO_SPEND_ZERO"],
      estimatedAmount: null,
      supportsGoal: "avoid putting protected plan amounts at risk",
      safeWithProtectedEssentials: true,
    });
  }

  if (!snapshot.plan) {
    limitations.push("No active plan exists, so plan comparisons and Safe-to-Spend recovery are unavailable.");
  }
  if (!snapshot.emergencyFund) {
    limitations.push("No emergency-fund record exists, so emergency-fund recovery is unavailable.");
  }
  limitations.push(
    "Transactions created before financial-bucket classification remain unknown and are excluded from bucket-specific recovery facts.",
  );
  if (snapshot.spending.unknownTransactionCount > 0) {
    limitations.push(
      `${snapshot.spending.unknownTransactionCount} transaction(s) have unknown financial buckets and are excluded from bucket-specific recommendations.`,
    );
  }

  const uniqueOptions = new Map<string, RecoveryOption>();
  for (const option of options) {
    const key = `${option.code}:${option.issueCodes.join(",")}:${option.estimatedAmount}`;
    uniqueOptions.set(key, option);
  }

  return {
    issues,
    options: [...uniqueOptions.values()],
    limitations: [...new Set(limitations)],
  };
}
