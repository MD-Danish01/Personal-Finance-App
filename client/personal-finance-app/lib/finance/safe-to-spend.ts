import { remainingAmount, sumAmounts } from "./calculations";
import {
  sumSpendingByBucket,
  type PlanAllocation,
  type SpendingTransaction,
} from "./plan-vs-actual";

export type SafeToSpendInput = {
  monthlyIncome: number;
  planMonth: number;
  planYear: number;
  allocations: readonly PlanAllocation[];
  transactions: readonly SpendingTransaction[];
  asOfDate: Date;
};

function allocationAmount(
  allocations: readonly PlanAllocation[],
  key: PlanAllocation["key"],
) {
  return sumAmounts(
    allocations.filter((allocation) => allocation.key === key).map((allocation) => allocation.amount),
  );
}

function daysRemainingInPlanMonth(month: number, year: number, asOfDate: Date) {
  const periodStart = Date.UTC(year, month - 1, 1);
  const periodEnd = Date.UTC(year, month, 0);
  const day = Date.UTC(
    asOfDate.getUTCFullYear(),
    asOfDate.getUTCMonth(),
    asOfDate.getUTCDate(),
  );
  const effectiveDay = Math.min(Math.max(day, periodStart), periodEnd);
  return Math.max(Math.floor((periodEnd - effectiveDay) / 86_400_000) + 1, 1);
}

export function calculateSafeToSpend(input: SafeToSpendInput) {
  const actualSpent = sumAmounts(
    input.transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount),
  );
  const actualByBucket = sumSpendingByBucket(input.transactions);
  const plannedEssential = allocationAmount(input.allocations, "essentials");
  const plannedSavings =
    allocationAmount(input.allocations, "future_savings") +
    allocationAmount(input.allocations, "long_term_wealth");
  const plannedEmergency = allocationAmount(input.allocations, "emergency");
  const requiredBuffer = allocationAmount(input.allocations, "buffer");
  const actualEssentialSpent = actualByBucket.essentials;
  const actualSavings =
    actualByBucket.future_savings + actualByBucket.long_term_wealth;
  const actualEmergency = actualByBucket.emergency;
  const actualBuffer = actualByBucket.buffer;
  const remainingEssentialExpenses = remainingAmount(plannedEssential, actualEssentialSpent);
  const remainingSavingsRequirement = remainingAmount(plannedSavings, actualSavings);
  const remainingEmergencyRequirement = remainingAmount(plannedEmergency, actualEmergency);
  const remainingBuffer = remainingAmount(requiredBuffer, actualBuffer);
  const protectedMoney = sumAmounts([
    remainingEssentialExpenses,
    remainingSavingsRequirement,
    remainingEmergencyRequirement,
    remainingBuffer,
  ]);
  const remainingIncome = input.monthlyIncome - actualSpent;
  const availableDiscretionary = Math.max(
    Math.max(remainingIncome, 0) - protectedMoney,
    0,
  );
  const daysRemaining = daysRemainingInPlanMonth(
    input.planMonth,
    input.planYear,
    input.asOfDate,
  );

  // Safe-to-spend is the remaining unprotected monthly money, spread evenly
  // across the remaining days. All amounts are integer paise.
  return {
    safeToSpend: Number(
      BigInt(availableDiscretionary) / BigInt(daysRemaining),
    ),
    remainingIncome,
    actualEssentialSpent,
    actualDiscretionarySpent: actualByBucket.enjoyment,
    actualSavings,
    plannedEssential,
    plannedSavings,
    plannedEmergency,
    requiredBuffer,
    remainingEssentialExpenses,
    remainingSavingsRequirement,
    remainingEmergencyRequirement,
    remainingBuffer,
    actualSpent,
    protectedMoney,
    availableDiscretionary,
    daysRemaining,
  };
}
