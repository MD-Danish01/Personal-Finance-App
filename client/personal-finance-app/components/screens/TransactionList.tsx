import type { Category, Transaction } from "@/lib/types";
import type { IconName } from "../ui/Icon";
import { TransactionRow } from "./TransactionRow";

interface RecentItem extends Transaction {
  relativeDate: string;
}

interface TransactionListProps {
  items: RecentItem[];
  onEdit?: (item: RecentItem) => void;
}

const ICON_BY_CATEGORY: Record<Category, { icon: IconName; bg: string }> = {
  Food: {
    icon: "utensils",
    bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  Transport: {
    icon: "car",
    bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  Shopping: {
    icon: "shopping-bag",
    bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  Entertainment: {
    icon: "film",
    bg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  Bills: {
    icon: "receipt",
    bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  Others: {
    icon: "wallet",
    bg: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
};

export function TransactionList({ items, onEdit }: TransactionListProps) {
  return (
    <div className="transaction-list divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border bg-card shadow-card">
      {items.map((item, index) => {
        const iconInfo =
          ICON_BY_CATEGORY[item.category] || ICON_BY_CATEGORY.Others;

        return (
          <div
            key={item.id}
            className="transaction-list-row"
            style={{
              animationDelay: `${index * 70}ms`,
            }}
          >
            <TransactionRow
              merchant={item.merchant}
              category={item.category}
              amount={item.amount}
              relativeDate={item.relativeDate}
              iconName={iconInfo.icon}
              iconBgClass={iconInfo.bg}
              type={item.type}
              onEdit={onEdit ? () => onEdit(item) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
