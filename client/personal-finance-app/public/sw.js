/**
 * public/sw.js  —  Personal Finance App Service Worker
 *
 * Caching strategies:
 *
 *   /_next/static/**   → Cache-first  (hashed filenames, immutable)
 *   /api/**            → Network-first → stale SW cache on failure
 *   navigate (pages)   → Network-first → cached shell → /offline fallback
 *   everything else    → Network-only  (pass-through, no caching)
 *
 * KEY RULE — online always wins:
 *   The SW never returns a cached response when the network succeeds.
 *   Cache is updated in the background on every successful network response
 *   so it is always as fresh as the last online visit.
 *
 * Pre-cached on install (app shells available for cold offline starts):
 *   /home  /money  /plan  /goals  /insights  /offline
 */

const CACHE = "pfa-v2";

const PRECACHE_URLS = [
  "/home",
  "/money",
  "/plan",
  "/goals",
  "/insights",
  "/offline",
];

// ─── Install ──────────────────────────────────────────────────────────────────
// Pre-cache the page shells so they are available for cold offline launches.
// skipWaiting() activates the SW immediately rather than waiting for old tabs
// to close first.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // addAll() fetches every URL and caches the response.
        // We use Promise.allSettled equivalent via individual adds so a single
        // 404 (e.g. route not yet deployed) doesn't block the whole install.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              // Ignore individual pre-cache failures (route may not exist yet)
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
// Delete any cache versions that are no longer current.
// clients.claim() takes control of all open pages without requiring a reload.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only intercept same-origin GET requests.
  // Cross-origin requests (fonts, Google OAuth, etc.) are passed through.
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // ── 1. Next.js static assets: cache-first ─────────────────────────────────
  // These files have content hashes in their names and are immutable.
  // Serve from cache immediately; if not cached yet, fetch and store.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetchAndCache(event.request),
      ),
    );
    return;
  }

  // ── 2. API calls: network-first, stale SW cache on failure ────────────────
  // On success  → update the SW cache in the background, return fresh response.
  // On failure  → serve the last SW-cached response for this exact URL.
  //
  // Note: localStorage-level caching (lib/cache.ts) handles the React-layer
  // fallback; this SW cache is a second safety net for the fetch layer.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          putInCache(event.request.clone(), res.clone());
          return res;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // ── 3. Page navigations: network-first, shell → /offline fallback ─────────
  // On success  → update cache so the shell is fresh for the next offline visit.
  // On failure  → serve the exact cached page shell if available.
  //               Last resort: serve /offline (always pre-cached on install).
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          putInCache(event.request.clone(), res.clone());
          return res;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached ?? caches.match("/offline")),
        ),
    );
    return;
  }

  // ── 4. Everything else: network-only (pass-through) ───────────────────────
  // Covers: public static files, images, fonts loaded from the same origin.
  // These are small or handled by Next.js optimisation; no special strategy needed.
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the request, store the response clone in the cache, and return it.
 * Used for immutable static assets (cache-first path).
 */
async function fetchAndCache(request) {
  const response = await fetch(request);
  const cache = await caches.open(CACHE);
  cache.put(request, response.clone());
  return response;
}

/**
 * Store a response clone in the cache without blocking the caller.
 * Used as a background side-effect on successful network fetches.
 */
function putInCache(request, response) {
  // Only cache successful responses to avoid storing error pages
  if (!response || response.status !== 200) return;
  caches.open(CACHE).then((cache) => cache.put(request, response));
}
