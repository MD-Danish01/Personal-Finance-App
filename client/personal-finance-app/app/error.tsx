"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it is a ChunkLoadError (happens after new deployments on open tabs)
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message?.includes("Failed to load chunk") ||
      error.message?.includes("Loading chunk");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("pfa_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("pfa_chunk_reload", String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Icon name="refresh-cw" size={24} />
      </div>
      <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
      <p className="text-xs text-muted mt-1 max-w-sm leading-relaxed">
        A new version of the app was recently deployed. Reload to get the latest update.
      </p>
      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          Reload Page
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-card border border-card-border px-4 py-2.5 text-xs font-semibold text-muted hover:bg-muted-bg transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
