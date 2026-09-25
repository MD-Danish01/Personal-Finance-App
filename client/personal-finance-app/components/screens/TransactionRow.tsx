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
  type?: "expense" | "income";
  onEdit?: () => void;
}

export function TransactionRow({
  merchant,
  category,
  amount,
  relativeDate,
  iconName,
  iconBgClass,
  type = "expense",
  onEdit,
}: TransactionRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}
      >
        <Icon name={iconName} size={20} className="text-foreground" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">
          {merchant}
        </div>
        <div className="text-xs text-muted">{category}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div
            className={`text-sm font-semibold ${
              type === "income"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground"
            }`}
          >
            {type === "income" ? "+" : "-"}{formatINR(amount / 100)}
          </div>
          <div className="text-xs text-muted">{relativeDate}</div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit transaction"
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary opacity-100 transition-all cursor-pointer focus:opacity-100 hover:bg-primary/20 md:bg-transparent md:text-muted md:opacity-0 md:group-hover:opacity-100 md:hover:bg-muted-bg md:hover:text-primary"
          >
            <Icon name="pencil" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
