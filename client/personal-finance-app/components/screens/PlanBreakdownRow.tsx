import type { PlanAllocation } from "@/lib/types";
import { Icon, type IconName } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";
import { formatINR, formatPercent } from "@/lib/format";

function formatPaise(paise: number): string {
  return formatINR(paise / 100);
}

interface PlanBreakdownRowProps {
  allocation: PlanAllocation;
  totalIncome: number;
  index?: number;
}

const ICON_MAP: Record<string, IconName> = {
  "shopping-bag": "shopping-bag",
  sparkles: "sparkles",
  shield: "shield",
  target: "target",
  "trending-up": "trending-up",
  wallet: "wallet",
};

export function PlanBreakdownRow({
  allocation,
  totalIncome,
  index = 0,
}: PlanBreakdownRowProps) {
  const icon = ICON_MAP[allocation.iconKey] ?? "wallet";
  return (
    <div
      className="plan-breakdown-row group flex items-center gap-3 px-4 py-3"
      style={{
        animationDelay: `${index * 70}ms`,
      }}
    >
      <span
        className={`plan-breakdown-icon flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${allocation.bgClass}`}
      >
        <Icon name={icon} size={18} className="text-foreground transition-transform duration-200 group-hover:scale-110" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground transition-transform duration-200 group-hover:translate-x-0.5">
          {allocation.label}
        </div>
        <div className="mt-1.5">
          <ProgressBar
            value={allocation.amount}
            max={totalIncome}
            colorClass={allocation.colorClass}
          />
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-foreground font-mono transition-transform duration-200 group-hover:-translate-x-0.5">
          {formatPaise(allocation.amount)}
        </div>
        <div className="text-xs text-muted font-mono">
          {formatPercent(allocation.percent)}
        </div>
      </div>
    </div>
  );
}
