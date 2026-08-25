import type { Category } from "@/lib/types";
import { Icon, type IconName } from "../ui/Icon";
import { formatINR } from "@/lib/format";

interface TransactionRowProps {
  merchant: string;
  category: Category;
  amount: number;
  relativeDate: string;
  iconName: IconName;
  iconBgClass: string;
}

export function TransactionRow({
  merchant,
  category,
  amount,
  relativeDate,
  iconName,
  iconBgClass,
}: TransactionRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`}
      >
        <Icon name={iconName} size={20} className="text-foreground" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">
          {merchant}
        </div>
        <div className="text-xs text-muted">{category}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-foreground">
          -{formatINR(amount / 100)}
        </div>
        <div className="text-xs text-muted">{relativeDate}</div>
      </div>
    </div>
  );
}
