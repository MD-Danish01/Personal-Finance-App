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
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return (
    <div className="rounded-2xl bg-card shadow-card border border-card-border p-4 transition-colors">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted-bg text-2xl shadow-xs" aria-hidden>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{name}</div>
          <div className="mt-2">
            <ProgressBar
              value={current}
              max={target}
              colorClass={colorClass}
            />
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs pt-1 border-t border-card-border">
        <span className="text-muted font-mono text-[11px]">
          {formatINR(current / 100)} / {formatINR(target / 100)}
        </span>
        <span className="font-bold text-primary font-mono">{formatPercent(pct)}</span>
      </div>
    </div>
  );
}
