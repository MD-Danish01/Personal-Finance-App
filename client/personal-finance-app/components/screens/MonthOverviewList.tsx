import Link from "next/link";
import type { MonthOverviewRow } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";
import { formatINR } from "@/lib/format";

interface MonthOverviewListProps {
  rows: MonthOverviewRow[];
}

export function MonthOverviewList({ rows }: MonthOverviewListProps) {
  return (
    <div className="rounded-2xl bg-card shadow-card border border-card divide-y divide-card-border overflow-hidden transition-colors">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted-bg/40 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {row.label}
              </span>
              {row.status === "goal" && (
                <span className="rounded-md bg-muted-bg px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Goal
                </span>
              )}
            </div>
            <div className="mt-2">
              <ProgressBar
                value={row.amount}
                max={row.of}
                colorClass={row.colorClass}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-foreground font-mono">
              {formatINR(row.amount)}
            </div>
            <div className="text-[11px] text-muted font-mono">of {formatINR(row.of)}</div>
          </div>
        </div>
      ))}
      <Link
        href="/money"
        className="block px-4 py-3 text-center text-xs font-bold text-primary hover:bg-muted-bg/50 transition-colors"
      >
        View detailed breakdown →
      </Link>
    </div>
  );
}
