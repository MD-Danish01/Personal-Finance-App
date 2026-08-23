"use client";

import { useEffect, useState } from "react";
import { getRecentTransactions, getSpendingByCategory } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { SpendingDonut } from "@/components/screens/SpendingDonut";
import { TransactionList } from "@/components/screens/TransactionList";
import type { RecentTransactions, SpendingSummary } from "@/lib/types";
import { ComingSoonButton } from "@/components/ui/ComingSoonDialog";

const DOT_COLORS: Record<string, string> = {
  Food: "bg-brand-green",
  Transport: "bg-brand-blue",
  Shopping: "bg-brand-purple",
  Bills: "bg-brand-orange",
  Others: "bg-gray-dot",
};

export default function MoneyPage() {
  const [spending, setSpending] = useState<SpendingSummary | null>(null);
  const [recent, setRecent] = useState<RecentTransactions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSpendingByCategory(), getRecentTransactions()])
      .then(([s, r]) => {
        setSpending(s);
        setRecent(r);
      })
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load"));
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <p className="mt-10 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!spending || !recent) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-10 rounded-xl bg-muted/50" />
          <div className="h-40 rounded-2xl bg-muted/50" />
          <div className="h-40 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <Header />

      <button type="button" aria-label="Change month" className="flex items-center gap-2 rounded-md py-1 text-sm font-medium hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
        {spending.monthLabel}
        <Icon name="chevron-down" size={16} />
      </button>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Spending by category</h2>
          <ComingSoonButton label="View all" />
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card border border-border/60">
          <SpendingDonut data={spending.byCategory} total={spending.total} />
          <div className="min-w-0 flex-1 space-y-3">
            {spending.byCategory.length === 0 ? (
              <p className="text-xs text-muted">No spending recorded yet</p>
            ) : (
              spending.byCategory.map((item) => (
                <div key={item.category} className="flex items-center gap-2 text-xs">
                  <CategoryDot colorClass={DOT_COLORS[item.category]} size={8} />
                  <span className="flex-1 truncate">{item.category}</span>
                  <span className="font-semibold">{formatINR(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-sm font-semibold">Recent transactions</h2>
        {recent.items.length === 0 ? (
          <p className="text-center text-sm text-muted py-8">
            No transactions yet. Connect your bank to see transactions.
          </p>
        ) : (
          <TransactionList items={recent.items} />
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <h1 className="text-[22px] font-bold tracking-tight">Money</h1>
      <div className="flex items-center gap-4">
        <button aria-label="Search" className="rounded-full p-1 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
          <Icon name="search" size={22} />
        </button>
        <button aria-label="Filter" className="rounded-full p-1 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
          <Icon name="filter" size={21} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
