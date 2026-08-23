"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function ComingSoonButton({ label, children }: { label?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-left hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 rounded-md w-full">
        {children ?? label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-bold">Coming soon</h2>
            <p className="mt-2 text-sm text-muted">This feature is planned for a future update.</p>
            <button type="button" onClick={() => setOpen(false)} className="mt-5 w-full rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
