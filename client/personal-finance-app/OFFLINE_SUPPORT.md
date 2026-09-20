# Offline Support Implementation Plan

## Problem

The app runs as a **remote URL in Capacitor's WebView** (`https://devforge.danishdev.me`).
When the device is offline:

1. The WebView **cannot load the initial HTML at all** — it shows a browser-style
   `ERR_INTERNET_DISCONNECTED` error page, not the React app.
2. Even if the app was already loaded and the user navigates to a new tab, every
   page visit triggers a server fetch for the Next.js HTML shell.
3. The existing `OfflineBanner` **only works if React is already mounted**. If the
   WebView never loaded the page in the first place, React never runs.

---

## Chosen Solution: Service Worker + localStorage Cache

Two complementary layers:

| Layer | Responsibility |
|---|---|
| **Service Worker** (`public/sw.js`) | Caches page HTML shells, JS/CSS bundles, and API responses. Serves stale assets when offline so the app can mount at all. |
| **`localStorage` cache** (`lib/cache.ts`) | Stores the last successful API response per endpoint. On failure the API functions return stale data instead of throwing, so pages render with real content rather than an error. |

**Key rule — online always wins:**
- When online, every API call hits the network and writes the fresh response to cache.
- When offline, the network call fails; the cached value is returned as a fallback.
- The SW uses **network-first** for all navigations and API fetches — cache is never
  served to an online user.

---

## Architecture

### Service Worker Caching Strategies

```
Request type                   Strategy
─────────────────────────────────────────────────────────────────
/_next/static/**               Cache-first (immutable hashed files)
/public assets (images, etc.)  Cache-first
/api/**                        Network-first → on failure serve cached SW response
Page navigations (mode=navigate) Network-first → on failure serve cached page shell
                                              → final fallback: /offline page
```

The SW pre-caches these page shells on `install`:

```
/home  /money  /plan  /goals  /insights  /offline
```

### localStorage Cache (`lib/cache.ts`)

```ts
cacheSet(key, data)           // serialises + timestamps to localStorage
cacheGet<T>(key, maxAgeMs)    // returns parsed value or null if missing/expired
```

Default max-age: **24 hours**. Each API function has its own cache key:

| API function              | Cache key                    |
|---------------------------|------------------------------|
| `getDashboard()`          | `cache:dashboard`            |
| `getSpendingByCategory()` | `cache:spending`             |
| `getRecentTransactions()` | `cache:transactions:recent`  |
| `getPlan()`               | `cache:plan`                 |
| `getGoals()`              | `cache:goals`                |
| `getInsights()`           | `cache:insights`             |

### Stale-data badge

When a page renders data from `localStorage` (offline fallback), it receives a
`fromCache: true` flag alongside the data. The page components display a small
amber banner:

```
⚠  Showing offline data — last updated <relative time>
```

The badge disappears when the app comes back online and fresh data loads.

---

## Files to Create / Modify

### New files

```
public/sw.js                                    Service worker
lib/cache.ts                                    localStorage helpers
app/offline/page.tsx                            Static offline fallback page
components/providers/ServiceWorkerRegistrar.tsx Client component that registers the SW
```

### Modified files

```
lib/api.ts                  All 6 functions: network-first + cache write/read
app/layout.tsx              Mount <ServiceWorkerRegistrar />
```

---

## Detailed Implementation

### 1. `lib/cache.ts`

```ts
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours default

export interface CacheEntry<T> {
  data: T;
  ts: number; // Date.now() at write time
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Ignore QuotaExceededError — cache is best-effort
  }
}

export function cacheGet<T>(
  key: string,
  maxAgeMs = MAX_AGE_MS
): { data: T; ts: number } | null {
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
```

### 2. `lib/api.ts` — Network-first with cache fallback

Every read function follows this exact pattern:

```ts
export async function getDashboard(): Promise<DashboardResult> {
  try {
    const { data } = await apiClient.get<DashboardSummary>("/dashboard");
    cacheSet("cache:dashboard", data);          // ← always write on success
    return { data, fromCache: false };
  } catch (err) {
    const hit = cacheGet<DashboardSummary>("cache:dashboard");
    if (hit) return { data: hit.data, fromCache: true, cachedAt: hit.ts };
    throw err;                                  // ← no cache, let page handle error
  }
}
```

Each API function returns a discriminated union:

```ts
export type ApiResult<T> =
  | { data: T; fromCache: false }
  | { data: T; fromCache: true; cachedAt: number };
```

### 3. `public/sw.js`

```js
const CACHE = "pfa-v1";
const PRECACHE_URLS = ["/home", "/money", "/plan", "/goals", "/insights", "/offline"];

// Install: pre-cache page shells
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: evict old cache versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ── Immutable static bundles: cache-first ──────────────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        cached => cached ?? fetchAndCache(event.request)
      )
    );
    return;
  }

  // ── API calls: network-first, stale fallback ───────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then(res => { backgroundCache(event.request.clone(), res.clone()); return res; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Page navigations: network-first, shell fallback, /offline last ─────
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(res => { backgroundCache(event.request.clone(), res.clone()); return res; })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached ?? caches.match("/offline"))
        )
    );
    return;
  }
});

async function fetchAndCache(request) {
  const res = await fetch(request);
  const cache = await caches.open(CACHE);
  cache.put(request, res.clone());
  return res;
}

function backgroundCache(request, response) {
  caches.open(CACHE).then(c => c.put(request, response));
}
```

### 4. `app/offline/page.tsx`

A **pure static page** — no `useEffect`, no API calls, no auth checks.
The service worker serves this as the absolute last resort when even the
cached shell for the requested route is not available.

```tsx
// No "use client" — this is a Server Component that renders to static HTML.
// The SW caches its HTML on install so it is available with zero network.
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center bg-background text-foreground">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted-bg">
        <WifiOff className="h-10 w-10 text-muted" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">You&apos;re Offline</h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed">
          Check your internet connection. The app will resume automatically
          once you&apos;re back online.
        </p>
      </div>
    </main>
  );
}
```

### 5. `components/providers/ServiceWorkerRegistrar.tsx`

```tsx
"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(console.error);
    }
  }, []);
  return null;
}
```

### 6. `app/layout.tsx` — mount the registrar

```tsx
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";

// inside <body>:
<ServiceWorkerRegistrar />
```

### 7. Stale-data banner in page components

Each page calls the updated API function which now returns `ApiResult<T>`.
When `fromCache` is `true`, render a small amber notice above the content:

```tsx
{result.fromCache && (
  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
    <WifiOff size={13} />
    <span>
      Showing offline data — last updated{" "}
      {formatRelativeTime(result.cachedAt)}
    </span>
  </div>
)}
```

Pages affected: `home/page.tsx`, `money/page.tsx`, `plan/page.tsx`,
`goals/page.tsx`, `insights/page.tsx`.

---

## What is NOT cached (by design)

| Feature | Reason |
|---|---|
| POST/PUT/DELETE mutations | Cannot be safely replayed without conflict resolution |
| Auth session | Server-side; caching would create stale auth state |
| AI chat / simulate | Real-time; stale AI answers are misleading |
| Setu bank connection | Sensitive financial linking flow |

---

## Testing

### In browser (Chrome DevTools)

1. Load the app, navigate to all 5 tabs (Home, Money, Plan, Goals, Insights).
2. DevTools → Application → Service Workers → confirm `sw.js` is active.
3. DevTools → Network → check **Offline**.
4. Refresh — should see `/offline` page (SW fallback).
5. Navigate within the already-loaded app — should see stale data with amber badge.
6. Uncheck Offline — data should refresh, badge should disappear.

### On Android device

1. Open app, browse all pages.
2. Turn on **Airplane Mode**.
3. Kill and relaunch app — should open to the offline page (SW-cached shell).
4. Navigate tabs — should show stale data from localStorage with the amber badge.
5. Turn off Airplane Mode — data should refresh automatically.

---

## Sequence: Online vs Offline

```
ONLINE
  User opens /home
    → SW: network-first → fetch server → cache page shell
    → React mounts → getDashboard() called
    → API: fetch /api/dashboard → success
    → cacheSet("cache:dashboard", data)  ← stored in localStorage
    → page renders fresh data, no badge

OFFLINE (app already loaded in WebView)
  User navigates to /goals
    → SW: network-first → fetch fails → serve cached /goals shell
    → React mounts → getGoals() called
    → API: fetch /api/goals → network error
    → cacheGet("cache:goals") → returns last cached value
    → page renders stale data + amber "Showing offline data" badge
    → OfflineBanner overlay also visible at root

OFFLINE (cold start — app was killed)
  User opens app
    → WebView tries to load https://devforge.danishdev.me/home
    → SW: network-first → fetch fails → serve cached /home shell
    → React mounts → getDashboard() → cache hit → stale data shown
    → If /home was never cached by SW → SW serves /offline fallback page
```
