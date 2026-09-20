import Link from "next/link";
import type { MonthOverviewRow } from "@/lib/types";
import { ProgressBar } from "../ui/ProgressBar";
import { formatINR } from "@/lib/format";

interface MonthOverviewListProps {
  rows: MonthOverviewRow[];
}

export function MonthOverviewList({ rows }: MonthOverviewListProps) {
  return (
    <div className="month-overview-list overflow-hidden rounded-2xl border border-card-border bg-card shadow-card">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className="month-overview-row group flex items-center gap-4 px-4 py-3.5 transition-all duration-300 hover:bg-muted-bg/40"
          style={{
            animationDelay: `${index * 80}ms`,
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground transition-transform duration-300 group-hover:translate-x-0.5">
                {row.label}
              </span>

              {row.status === "goal" && (
                <span className="month-goal-badge rounded-md bg-muted-bg px-1.5 py-0.5 text-[10px] font-bold text-primary">
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

          <div className="shrink-0 text-right">
            <div className="text-xs font-bold text-foreground font-mono transition-transform duration-300 group-hover:-translate-x-0.5">
              {formatINR(row.amount)}
            </div>

            <div className="text-[11px] text-muted font-mono">
              of {formatINR(row.of)}
            </div>
          </div>
        </div>
      ))}

      <Link
        href="/money"
        className="month-overview-link group block px-4 py-3 text-center text-xs font-bold text-primary transition-all duration-300 hover:bg-muted-bg/50"
      >
        <span className="inline-flex items-center gap-1 transition-transform duration-300 group-hover:translate-x-0.5">
          View detailed breakdown
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </Link>
    </div>
  );
}