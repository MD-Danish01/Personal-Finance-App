import Link from "next/link";
import type { MonthOverviewRow } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";
import { formatINR } from "@/lib/format";

interface MonthOverviewListProps {
  rows: MonthOverviewRow[];
}

export function MonthOverviewList({ rows }: MonthOverviewListProps) {
  return (
    <div className="rounded-2xl bg-white shadow-card border border-border/60 divide-y divide-border/60">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {row.label}
              </span>
              {row.status === "goal" && (
                <span className="rounded-full bg-black/[.04] px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  Goal
                </span>
              )}
            </div>
            <div className="mt-1.5">
              <ProgressBar
                value={row.amount}
                max={row.of}
                colorClass={row.colorClass}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-foreground">
              {formatINR(row.amount)}
            </div>
            <div className="text-xs text-muted">of {formatINR(row.of)}</div>
          </div>
        </div>
      ))}
      <Link
        href="/money"
        className="block px-4 py-2.5 text-center text-xs font-medium text-brand-blue"
      >
        View detailed breakdown →
      </Link>
    </div>
  );
}
