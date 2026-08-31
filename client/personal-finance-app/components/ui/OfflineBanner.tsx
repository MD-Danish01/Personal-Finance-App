"use client";

import { WifiOff } from "lucide-react";
import { useOfflineState } from "@/components/providers/OfflineProvider";

/**
 * OfflineBanner renders a full-screen overlay whenever the device loses
 * network connectivity.  It sits at `z-50` so it floats above all other UI
 * including the BottomNav and DesktopSidebar.
 *
 * The banner disappears automatically as soon as connectivity is restored —
 * no user interaction is required.
 */
export function OfflineBanner() {
  const { isOffline } = useOfflineState();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/95 backdrop-blur-sm px-6 text-center"
    >
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted-bg">
        <WifiOff className="h-10 w-10 text-muted" strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">You&apos;re Offline</h2>
        <p className="text-sm text-muted leading-relaxed max-w-xs">
          Check your internet connection. The app will resume automatically once
          you&apos;re back online.
        </p>
      </div>

      {/* Subtle animated indicator */}
      <div className="flex gap-1.5 pt-2">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 rounded-full bg-muted animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
