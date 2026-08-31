/**
 * app/offline/page.tsx
 *
 * Static fallback page served by the Service Worker when:
 *   1. The user opens the app cold (no network, no cached shell for the route).
 *   2. Any navigation fails and no cached shell exists for that specific route.
 *
 * Requirements:
 *   - No "use client" — Server Component so it renders to pure static HTML.
 *   - No API calls, no auth checks, no dynamic data.
 *   - The SW pre-caches this page on install so it is always available.
 */
import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline — Personal Finance",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-background text-foreground">
      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted-bg">
        <WifiOff className="h-11 w-11 text-muted" strokeWidth={1.5} />
      </div>

      {/* Copy */}
      <div className="space-y-2 max-w-xs">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          You&apos;re Offline
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          No internet connection found. Check your network and the app will
          resume automatically once you&apos;re back online.
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2 pt-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 rounded-full bg-muted animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </main>
  );
}
