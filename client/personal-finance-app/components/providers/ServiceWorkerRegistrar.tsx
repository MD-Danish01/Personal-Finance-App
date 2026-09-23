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
    // Listen for new service worker taking control and refresh to get latest assets
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Global listener for ChunkLoadError (triggered when navigating with a stale build after deployment)
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = "error" in event ? event.error : event.reason;
      const message = error?.message || String(error || "");
      const isChunkError =
        error?.name === "ChunkLoadError" ||
        message.includes("Failed to load chunk") ||
        message.includes("Loading chunk");

      if (isChunkError) {
        const lastReload = sessionStorage.getItem("pfa_chunk_reload");
        const now = Date.now();
        // Prevent reload loop: only reload once per 10 seconds
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("pfa_chunk_reload", String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleChunkError);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleChunkError);
    };
  }, []);

  return null;
}
