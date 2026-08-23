import { boundedPercentage, difference, sumAmounts } from "./calculations";

export const transactionCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

export const allocationKeys = [
  "essentials",
  "enjoyment",
  "emergency",
  "future_savings",
  "long_term_wealth",
  "buffer",
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];
export type AllocationKey = (typeof allocationKeys)[number];
export type FinancialBucket = AllocationKey | "unknown";
export type SpendingTransaction = {
  amount: number;
  type: "expense" | "income";
  category: TransactionCategory;
  financialBucket: FinancialBucket;
};
export type PlanAllocation = {
  key: AllocationKey;
  amount: number;
};

export function sumSpendingByCategory(
  transactions: readonly SpendingTransaction[],
) {
  const spending = Object.fromEntries(
    transactionCategories.map((category) => [category, 0]),
  ) as Record<TransactionCategory, number>;

  for (const category of transactionCategories) {
    spending[category] = sumAmounts(
      transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category,
        )
        .map((transaction) => transaction.amount),
    );
  }
  return spending;
}

export function sumSpendingByBucket(
  transactions: readonly SpendingTransaction[],
) {
  const spending = Object.fromEntries(
    allocationKeys.map((key) => [key, 0]),
  ) as Record<AllocationKey, number>;

  for (const key of allocationKeys) {
    spending[key] = sumAmounts(
      transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.financialBucket === key,
        )
        .map((transaction) => transaction.amount),
    );
  }
  return spending;
}

export function calculatePlanVsActual(
  allocations: readonly PlanAllocation[],
  transactions: readonly SpendingTransaction[],
) {
  const spending = sumSpendingByBucket(transactions);

  return allocations.map((allocation) => {
    const actualAmount = spending[allocation.key];
    const varianceAmount = difference(actualAmount, allocation.amount);

    return {
      allocationKey: allocation.key,
      plannedAmount: allocation.amount,
      actualAmount,
      varianceAmount,
      variancePercent: boundedPercentage(Math.abs(varianceAmount), allocation.amount),
      status: varianceAmount > 0
        ? "OVER" as const
        : varianceAmount < 0
          ? "UNDER" as const
          : "ON_TRACK" as const,
      categories: [],
    };
  });
}
