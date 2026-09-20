/**
 * lib/cache.ts
 *
 * Thin localStorage wrapper used by lib/api.ts for offline-fallback caching.
 *
 * Rules:
 *  - cacheSet() is called on every successful network response.
 *  - cacheGet() is called only when the network call fails (offline fallback).
 *  - Entries expire after MAX_AGE_MS (24 h). Expired entries are treated as
 *    missing so a stale-forever response is never returned.
 *  - All errors are swallowed — cache is best-effort and must never crash the app.
 */

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  ts: number; // Date.now() at write time
}

/**
 * Serialise `data` to localStorage under `key`.
 * Silently ignores QuotaExceededError and JSON errors.
 */
export function cacheSet<T>(key: string, data: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // QuotaExceededError or serialisation error — best-effort, ignore
  }
}

/**
 * Read and deserialise the entry stored under `key`.
 *
 * Returns `null` when:
 *  - nothing is stored under that key
 *  - the entry is older than `maxAgeMs` (default 24 h)
 *  - the stored value cannot be parsed
 */
export function cacheGet<T>(
  key: string,
  maxAgeMs: number = MAX_AGE_MS,
): { data: T; ts: number } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > maxAgeMs) return null; // expired
    return { data: entry.data, ts: entry.ts };
  } catch {
    return null;
  }
}
