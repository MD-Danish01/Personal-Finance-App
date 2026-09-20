import { ProgressBar } from "../ui/ProgressBar";
import { formatINR, formatPercent } from "@/lib/format";

interface GoalProgressCardProps {
  name: string;
  icon: string;
  current: number;
  target: number;
  colorClass: string;
}

export function GoalProgressCard({
  name,
  icon,
  current,
  target,
  colorClass,
}: GoalProgressCardProps) {
  const pct =
    target > 0
      ? Math.min(Math.round((current / target) * 100), 100)
      : 0;

  return (
    <div className="goal-progress-card group rounded-2xl border border-card-border bg-card p-4 shadow-card">
      {/* Goal header */}
      <div className="flex items-center gap-3">
        <span
          className="goal-progress-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted-bg text-2xl shadow-xs"
          aria-hidden
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-xs font-bold text-foreground">
              {name}
            </div>

            <span className="goal-percent text-[11px] font-bold font-mono text-primary">
              {formatPercent(pct)}
            </span>
          </div>

          <div className="mt-2">
            <ProgressBar
              value={current}
              max={target}
              colorClass={colorClass}
            />
          </div>
        </div>
      </div>

      {/* Goal numbers */}
      <div className="mt-2.5 flex items-center justify-between border-t border-card-border pt-2.5 text-xs">
        <span className="text-[11px] font-mono text-muted">
          {formatINR(current / 100)} / {formatINR(target / 100)}
        </span>

        <span className="goal-status text-[11px] font-semibold text-muted">
          {pct >= 100 ? "Completed" : "In progress"}
        </span>
      </div>
    </div>
  );
}