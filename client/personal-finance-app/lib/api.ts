import {
  mockDashboard,
  mockGoals,
  mockInsights,
  mockPlan,
  mockRecentTransactions,
  mockSpending,
} from "./mock-data";
import type {
  DashboardSummary,
  Goal,
  InsightsBundle,
  Plan,
  RecentTransactions,
  SpendingSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  if (!API_BASE) return fallback;
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getDashboard(): Promise<DashboardSummary> {
  return getJson<DashboardSummary>("/api/dashboard", mockDashboard);
}

export async function getSpendingByCategory(
  month: string,
): Promise<SpendingSummary> {
  void month;
  return getJson<SpendingSummary>("/api/spending", mockSpending);
}

export async function getRecentTransactions(): Promise<RecentTransactions> {
  return getJson<RecentTransactions>(
    "/api/transactions/recent",
    mockRecentTransactions,
  );
}

export async function getPlan(): Promise<Plan> {
  return getJson<Plan>("/api/plans/current", mockPlan);
}

export async function getGoals(): Promise<Goal[]> {
  return getJson<Goal[]>("/api/goals", mockGoals);
}

export async function getInsights(): Promise<InsightsBundle> {
  return getJson<InsightsBundle>("/api/insights", mockInsights);
}
