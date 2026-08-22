import type { PlanAllocation } from "@/lib/types";
import { Icon, type IconName } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";
import { formatINR, formatPercent } from "@/lib/format";

interface PlanBreakdownRowProps {
  allocation: PlanAllocation;
  totalIncome: number;
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
}: PlanBreakdownRowProps) {
  const icon = ICON_MAP[allocation.iconKey] ?? "wallet";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${allocation.bgClass}`}
      >
        <Icon name={icon} size={18} className="text-foreground" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">
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
        <div className="text-sm font-semibold text-foreground">
          {formatINR(allocation.amount)}
        </div>
        <div className="text-xs text-muted">
          {formatPercent(allocation.percent)}
        </div>
      </div>
    </div>
  );
}
