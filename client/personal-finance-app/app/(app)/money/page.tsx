import { getRecentTransactions, getSpendingByCategory } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { Icon } from "@/components/ui/Icon";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { SpendingDonut } from "@/components/screens/SpendingDonut";
import { TransactionList } from "@/components/screens/TransactionList";

const DOT_COLORS: Record<string, string> = {
  Food: "bg-brand-green",
  Transport: "bg-brand-blue",
  Shopping: "bg-brand-purple",
  Bills: "bg-brand-orange",
  Others: "bg-gray-dot",
};

export default async function MoneyPage() {
  const [spending, recent] = await Promise.all([
    getSpendingByCategory("May 2024"),
    getRecentTransactions(),
  ]);

  return (
    <div className="px-5 pb-4">
      <header className="flex items-center justify-between px-1 py-5">
        <h1 className="text-[22px] font-bold tracking-tight">Money</h1>
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="rounded-full p-1">
            <Icon name="search" size={22} />
          </button>
          <button aria-label="Filter" className="rounded-full p-1">
            <Icon name="filter" size={21} />
          </button>
          <ProfileAvatar name="Aarav" />
        </div>
      </header>

      <button className="flex items-center gap-2 py-1 text-sm font-medium">
        {spending.monthLabel}
        <Icon name="chevron-down" size={16} />
      </button>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Spending by category</h2>
          <button className="text-xs font-medium text-brand-blue">View all</button>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card border border-border/60">
          <SpendingDonut data={spending.byCategory} total={spending.total} />
          <div className="min-w-0 flex-1 space-y-3">
            {spending.byCategory.map((item) => (
              <div key={item.category} className="flex items-center gap-2 text-xs">
                <CategoryDot colorClass={DOT_COLORS[item.category]} size={8} />
                <span className="flex-1 truncate">{item.category}</span>
                <span className="font-semibold">{formatINR(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-sm font-semibold">Recent transactions</h2>
        <TransactionList items={recent.items} />
      </section>
    </div>
  );
}
