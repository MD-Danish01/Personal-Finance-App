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
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white shadow-card border border-border/60 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{name}</div>
          <div className="mt-1.5">
            <ProgressBar
              value={current}
              max={target}
              colorClass={colorClass}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted">
          {formatINR(current)} / {formatINR(target)}
        </span>
        <span className="font-semibold text-foreground">{formatPercent(pct)}</span>
      </div>
    </div>
  );
}
