"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface OfflineContextValue {
  isOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({ isOffline: false });

/**
 * OfflineProvider tracks the browser's network connectivity state using
 * `navigator.onLine` together with the `online` / `offline` window events.
 *
 * This is more reliable inside a Capacitor WebView than using
 * `navigator.onLine` alone, because the events fire correctly even when the
 * device loses its upstream internet connection (not just the OS interface).
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  // Initialise lazily from `navigator.onLine` so we never have a stale value.
  // Using the lazy-initialiser form of useState avoids calling setState inside
  // an effect, which would trigger an extra render.
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

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
