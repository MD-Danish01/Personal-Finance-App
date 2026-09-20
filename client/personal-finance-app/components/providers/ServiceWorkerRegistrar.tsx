"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistrar
 *
 * Thin client component that registers public/sw.js on mount.
 * Renders nothing — mounted once in the root layout.
 *
 * Registration is skipped in development (`next dev`) because:
 *   - The SW would cache Next.js HMR responses and break hot-reload.
 *   - Offline behaviour is tested against `next build && next start`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for a waiting SW (new version deployed) and activate it
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              // A new SW is ready — activate immediately so the cache is fresh
              newSW.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {
        // Registration failed (e.g. non-HTTPS) — app works normally without SW
      });
  }, []);

  return null;
}
