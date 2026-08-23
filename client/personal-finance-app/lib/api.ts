import { apiClient } from "./client";
import type {
  DashboardSummary,
  Goal,
  InsightsBundle,
  Plan,
  RecentTransactions,
  SpendingSummary,
} from "./types";

export async function getDashboard(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard");
  return data;
}

export async function getSpendingByCategory(
  month?: string,
): Promise<SpendingSummary> {
  const params = month ? { month } : undefined;
  const { data } = await apiClient.get<SpendingSummary>("/spending", { params });
  return data;
}

export async function getRecentTransactions(): Promise<RecentTransactions> {
  const { data } = await apiClient.get<RecentTransactions>(
    "/transactions/recent",
  );
  return data;
}

export async function getPlan(): Promise<Plan> {
  const { data } = await apiClient.get<Plan>("/plans/current");
  return data;
}

export async function getGoals(): Promise<Goal[]> {
  const { data } = await apiClient.get<Goal[]>("/goals");
  return data;
}

export async function getInsights(): Promise<InsightsBundle> {
  const { data } = await apiClient.get<InsightsBundle>("/insights");
  return data;
}
