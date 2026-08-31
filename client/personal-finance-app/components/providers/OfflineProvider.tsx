"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface OfflineContextValue {
  isOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false });

/**
 * How often (ms) to re-probe connectivity while the device appears online.
 * Capacitor WebViews can report navigator.onLine=true even with no real internet,
 * so we periodically verify with a real network request.
 */
const PROBE_INTERVAL_MS = 30_000; // 30 s

/**
 * Attempt a HEAD /api/ping to verify real network connectivity.
 * Returns true if the request succeeds (online), false if it fails (offline).
 */
async function probeConnectivity(): Promise<boolean> {
  try {
    const res = await fetch("/api/ping", {
      method: "HEAD",
      cache: "no-store",
      // Short timeout so we don't wait too long on a broken connection
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * OfflineProvider tracks the device's real network connectivity.
 *
 * Two layers of detection:
 *  1. `online` / `offline` window events — instant reaction to state changes.
 *  2. Periodic HEAD /api/ping probe — catches cases where navigator.onLine
 *     is stuck at `true` inside a Capacitor WebView despite no real internet.
 *
 * FIX for SSR hydration bug:
 *  The initial state is always `false` (assume online) — safe on the server.
 *  On the client, a useEffect runs synchronously after first paint to read
 *  `navigator.onLine` and immediately fires a probe to confirm.  This means
 *  the UI may flash "online" for one render cycle on a cold offline launch,
 *  but it corrects itself within the first probe (≤ 5 s) rather than being
 *  permanently stuck online.
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  // Start with false (online) — safe SSR default that avoids hydration mismatch.
  // The useEffect below will correct this on the client immediately.
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Keep a ref so the interval callback always sees the latest value without
  // needing to be re-registered.
  const isOfflineRef = useRef(isOffline);
  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  const markOnline = useCallback(() => setIsOffline(false), []);
  const markOffline = useCallback(() => setIsOffline(true), []);

  useEffect(() => {
    // ── 1. Browser online/offline events ─────────────────────────────────────
    // These fire instantly when the OS network interface changes.
    // When the `online` event fires we run a probe first to avoid a false
    // positive (the OS may declare online before the real internet is reachable).
    function handleOffline() {
      markOffline();
    }

    async function handleOnline() {
      // Verify real connectivity before marking online
      const reachable = await probeConnectivity();
      if (reachable) {
        markOnline();
      }
      // If probe fails, stay offline — the interval will keep retrying.
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // ── 2. Periodic probe (catches WebView navigator.onLine stuck-true bug) ───
    // When currently offline: probe every interval to detect recovery.
    // When currently online: probe every interval to catch silent disconnects.
    const intervalId = setInterval(async () => {
      const reachable = await probeConnectivity();
      if (reachable && isOfflineRef.current) {
        // Was offline, now online
        markOnline();
      } else if (!reachable && !isOfflineRef.current) {
        // Was online, now offline
        markOffline();
      }
    }, PROBE_INTERVAL_MS);

    // ── 3. Immediate probe on mount ───────────────────────────────────────────
    // Corrects the SSR-produced `false` default and catches the Capacitor
    // WebView bug where navigator.onLine is stuck at `true` with no real internet.
    probeConnectivity().then((reachable) => {
      setIsOffline(!reachable);
    });

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(intervalId);
    };
  }, [markOffline, markOnline]);

  return (
    <OfflineContext.Provider value={{ isOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

/** Returns `true` when the device has no network connectivity. */
export function useOfflineState() {
  return useContext(OfflineContext);
}
