import type { Category } from "@/lib/types";
import type { IconName } from "../ui/Icon";
import { TransactionRow } from "./TransactionRow";

interface RecentItem {
  id: string;
  merchant: string;
  category: Category;
  amount: number;
  relativeDate: string;
}

interface TransactionListProps {
  items: RecentItem[];
}

const ICON_BY_CATEGORY: Record<Category, { icon: IconName; bg: string }> = {
  Food: { icon: "utensils", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  Transport: { icon: "car", bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  Shopping: { icon: "shopping-bag", bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  Entertainment: { icon: "film", bg: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  Bills: { icon: "receipt", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  Others: { icon: "wallet", bg: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
};

export function TransactionList({ items }: TransactionListProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card border border-card-border divide-y divide-card-border transition-colors">
      {items.map((item) => {
        const iconInfo = ICON_BY_CATEGORY[item.category] || ICON_BY_CATEGORY.Others;
        return (
          <TransactionRow
            key={item.id}
            merchant={item.merchant}
            category={item.category}
            amount={item.amount}
            relativeDate={item.relativeDate}
            iconName={iconInfo.icon}
            iconBgClass={iconInfo.bg}
          />
        );
      })}
    </div>
  );
}
