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
  Food: { icon: "utensils", bg: "bg-brand-orange-soft" },
  Transport: { icon: "car", bg: "bg-foreground/90 [&_svg]:text-white" },
  Shopping: { icon: "shopping-cart", bg: "bg-brand-purple-soft" },
  Entertainment: { icon: "film", bg: "bg-brand-red-soft" },
  Bills: { icon: "receipt", bg: "bg-brand-red-soft" },
  Others: { icon: "more", bg: "bg-black/[.04]" },
};

export function TransactionList({ items }: TransactionListProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card border border-border/60 divide-y divide-border/60">
      {items.map((item) => {
        const iconInfo = ICON_BY_CATEGORY[item.category];
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
