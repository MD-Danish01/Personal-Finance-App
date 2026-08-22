import type {
  DashboardSummary,
  Goal,
  InsightsBundle,
  Plan,
  RecentTransactions,
  SpendingSummary,
  User,
} from "./types";

export const mockUser: User = {
  id: "user_aarav",
  name: "Aarav",
};

export const mockDashboard: DashboardSummary = {
  greetingName: "Aarav",
  safeToSpendToday: 327,
  safeToSpendSubtitle: "Stays within your plan",
  monthSpent: 12420,
  monthBudget: 30000,
  overview: [
    { label: "Spent", amount: 12420, of: 30000, colorClass: "bg-brand-green" },
    {
      label: "Savings",
      amount: 2500,
      of: 3000,
      colorClass: "bg-brand-green",
    },
    {
      label: "Enjoyment",
      amount: 2400,
      of: 3000,
      colorClass: "bg-brand-orange",
    },
    {
      label: "Emergency fund",
      amount: 2000,
      of: 2000,
      colorClass: "bg-brand-green",
      status: "goal",
    },
  ],
  topGoal: {
    name: "Laptop",
    icon: "💻",
    current: 50400,
    target: 80000,
    colorClass: "bg-brand-purple",
  },
  insight: {
    text: "You're ₹420 ahead of your spending plan. Great job! 👏",
    tone: "positive",
  },
};

export const mockSpending: SpendingSummary = {
  monthLabel: "May 2024",
  total: 12420,
  byCategory: [
    { category: "Food", amount: 4120 },
    { category: "Transport", amount: 2210 },
    { category: "Shopping", amount: 1980 },
    { category: "Bills", amount: 2350 },
    { category: "Others", amount: 1760 },
  ],
};

export const mockRecentTransactions: RecentTransactions = {
  items: [
    {
      id: "tx_1",
      amount: 320,
      type: "expense",
      category: "Food",
      merchant: "Swiggy",
      description: "Food delivery",
      transactionDate: "2024-05-31",
      source: "MANUAL",
      relativeDate: "Today",
    },
    {
      id: "tx_2",
      amount: 280,
      type: "expense",
      category: "Transport",
      merchant: "Uber",
      description: "Cab ride",
      transactionDate: "2024-05-31",
      source: "MANUAL",
      relativeDate: "Today",
    },
    {
      id: "tx_3",
      amount: 1240,
      type: "expense",
      category: "Shopping",
      merchant: "Zudio",
      description: "Clothing",
      transactionDate: "2024-05-25",
      source: "MANUAL",
      relativeDate: "Yesterday",
    },
    {
      id: "tx_4",
      amount: 649,
      type: "expense",
      category: "Entertainment",
      merchant: "Netflix",
      description: "Subscription",
      transactionDate: "2024-05-02",
      source: "ACCOUNT_AGGREGATOR",
      relativeDate: "2 May",
    },
    {
      id: "tx_5",
      amount: 299,
      type: "expense",
      category: "Bills",
      merchant: "Airtel Prepaid",
      description: "Mobile recharge",
      transactionDate: "2024-05-01",
      source: "ACCOUNT_AGGREGATOR",
      relativeDate: "1 May",
    },
  ],
};

export const mockPlan: Plan = {
  id: "plan_2024_05",
  month: "May",
  year: 2024,
  monthlyIncome: 30000,
  status: "active",
  allocations: [
    {
      key: "essentials",
      label: "Essentials",
      amount: 16000,
      percent: 53,
      colorClass: "bg-brand-green",
      bgClass: "bg-brand-green-soft",
      iconKey: "shopping-bag",
    },
    {
      key: "enjoyment",
      label: "Enjoyment",
      amount: 3000,
      percent: 10,
      colorClass: "bg-brand-orange",
      bgClass: "bg-brand-orange-soft",
      iconKey: "sparkles",
    },
    {
      key: "emergency",
      label: "Emergency fund",
      amount: 2000,
      percent: 7,
      colorClass: "bg-brand-red",
      bgClass: "bg-brand-red-soft",
      iconKey: "shield",
    },
    {
      key: "future_savings",
      label: "Future savings (Goals)",
      amount: 3000,
      percent: 10,
      colorClass: "bg-brand-purple",
      bgClass: "bg-brand-purple-soft",
      iconKey: "target",
    },
    {
      key: "long_term_wealth",
      label: "Long term wealth",
      amount: 2000,
      percent: 7,
      colorClass: "bg-brand-blue",
      bgClass: "bg-brand-blue-soft",
      iconKey: "trending-up",
    },
    {
      key: "buffer",
      label: "Buffer",
      amount: 4000,
      percent: 13,
      colorClass: "bg-brand-yellow",
      bgClass: "bg-brand-yellow-soft",
      iconKey: "wallet",
    },
  ],
  whyThisPlan:
    "This plan is designed to cover your needs, build safety, achieve your goals and help you grow in the long run.",
};

export const mockGoals: Goal[] = [
  {
    id: "goal_laptop",
    name: "Laptop",
    icon: "💻",
    iconBgClass: "bg-brand-purple-soft",
    targetAmount: 80000,
    currentAmount: 50400,
    deadline: "Dec 2024",
    monthlyTarget: 5000,
    status: "on_track",
  },
  {
    id: "goal_goa",
    name: "Goa Trip",
    icon: "🌴",
    iconBgClass: "bg-brand-green-soft",
    targetAmount: 30000,
    currentAmount: 8400,
    deadline: "Aug 2024",
    monthlyTarget: 4000,
    status: "on_track",
  },
  {
    id: "goal_emergency",
    name: "Emergency Fund",
    icon: "🛡",
    iconBgClass: "bg-brand-red-soft",
    targetAmount: 60000,
    currentAmount: 25000,
    deadline: "6 months",
    monthlyTarget: 2000,
    status: "on_track",
  },
];

export const mockInsights: InsightsBundle = {
  spendingTrend: { value: 18, vsLabel: "vs last month" },
  savingsRate: { value: 16, label: "Good" },
  items: [
    {
      id: "ins_1",
      title: "Food spending alert",
      description: "You spent ₹1,200 more on Food compared to last month.",
      tone: "info",
    },
    {
      id: "ins_2",
      title: "Goal projection",
      description:
        "If you keep saving ₹3,000/month, you can reach your Laptop goal 17 days early.",
      tone: "positive",
    },
    {
      id: "ins_3",
      title: "Weekend pattern",
      description: "Weekend spending is 2.1× higher than weekdays.",
      tone: "warning",
    },
  ],
};
