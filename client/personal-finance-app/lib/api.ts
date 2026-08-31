import { apiClient } from "./client";
import { cacheGet, cacheSet } from "./cache";
import type {
  ApiResult,
  DashboardSummary,
  Goal,
  InsightsBundle,
  Plan,
  RecentTransactions,
  SpendingSummary,
} from "./types";

/**
 * All read functions follow the same network-first pattern:
 *
 *  1. Try the network.  On success → write to localStorage + return { fromCache: false }.
 *  2. On any network/HTTP failure → read localStorage.
 *     If a non-expired entry exists → return { fromCache: true, cachedAt }.
 *     If nothing cached → re-throw so the page can show its own error UI.
 *
 * This means:
 *  - ONLINE  → always fresh data, cache is merely updated as a side-effect.
 *  - OFFLINE → stale data from the last successful online visit.
 */

export async function getDashboard(): Promise<ApiResult<DashboardSummary>> {
  try {
    const { data } = await apiClient.get<DashboardSummary>("/dashboard");
    cacheSet("cache:dashboard", data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<DashboardSummary>("cache:dashboard");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}

export async function getSpendingByCategory(
  month?: string,
): Promise<ApiResult<SpendingSummary>> {
  // Include month in cache key so different months don't overwrite each other
  const cacheKey = month ? `cache:spending:${month}` : "cache:spending";
  try {
    const params = month ? { month } : undefined;
    const { data } = await apiClient.get<SpendingSummary>("/spending", { params });
    cacheSet(cacheKey, data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<SpendingSummary>(cacheKey);
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}

export async function getRecentTransactions(): Promise<ApiResult<RecentTransactions>> {
  try {
    const { data } = await apiClient.get<RecentTransactions>("/transactions/recent");
    cacheSet("cache:transactions:recent", data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<RecentTransactions>("cache:transactions:recent");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}

export async function getPlan(): Promise<ApiResult<Plan>> {
  try {
    const { data } = await apiClient.get<Plan>("/plans/current");
    cacheSet("cache:plan", data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<Plan>("cache:plan");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}

export async function getGoals(): Promise<ApiResult<Goal[]>> {
  try {
    const { data } = await apiClient.get<Goal[]>("/goals");
    cacheSet("cache:goals", data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<Goal[]>("cache:goals");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}

export async function getInsights(): Promise<ApiResult<InsightsBundle>> {
  try {
    const { data } = await apiClient.get<InsightsBundle>("/insights");
    cacheSet("cache:insights", data);
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<InsightsBundle>("cache:insights");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;
  }
}
