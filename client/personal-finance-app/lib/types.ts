export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Bills"
  | "Others";

export type CategoryWithEssentials = Category | "Essentials";

export type TransactionType = "expense" | "income";

export type TransactionSource = "MANUAL" | "ACCOUNT_AGGREGATOR";

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  merchant: string;
  description?: string;
  transactionDate: string;
  source: TransactionSource;
}

export interface CategorySpending {
  category: Category;
  amount: number;
}

export type AllocationKey =
  | "essentials"
  | "enjoyment"
  | "emergency"
  | "future_savings"
  | "long_term_wealth"
  | "buffer";

export interface PlanAllocation {
  key: AllocationKey;
  label: string;
  amount: number;
  percent: number;
  colorClass: string;
  bgClass: string;
  iconKey: string;
}

export interface Plan {
  id: string;
  month: string;
  year: number;
  monthlyIncome: number;
  status: "draft" | "recommended" | "active";
  allocations: PlanAllocation[];
  whyThisPlan: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  iconBgClass: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyTarget: number;
  status: "on_track" | "at_risk" | "completed";
}

export interface MonthOverviewRow {
  label: string;
  amount: number;
  of: number;
  colorClass: string;
  status?: "goal";
}

export interface DashboardSummary {
  greetingName: string;
  safeToSpendToday: number;
  safeToSpendSubtitle: string;
  monthSpent: number;
  monthBudget: number;
  overview: MonthOverviewRow[];
  topGoal: {
    name: string;
    icon: string;
    current: number;
    target: number;
    colorClass: string;
  };
  insight: {
    text: string;
    tone: "positive" | "warning" | "info";
  };
}

export interface SpendingSummary {
  monthLabel: string;
  total: number;
  byCategory: CategorySpending[];
}

export interface RecentTransactions {
  items: (Transaction & { relativeDate: string })[];
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  tone: "positive" | "warning" | "info";
}

export interface InsightsBundle {
  spendingTrend: { value: number; vsLabel: string };
  savingsRate: { value: number; label: string };
  items: Insight[];
}

export interface User {
  id: string;
  name: string;
}
