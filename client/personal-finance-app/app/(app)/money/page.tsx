"use client";

import { useEffect, useState, useCallback } from "react";
import { getRecentTransactions, getSpendingByCategory } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CategoryDot } from "@/components/ui/CategoryDot";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Card } from "@/components/ui/Card";
import { SpendingDonut } from "@/components/screens/SpendingDonut";
import { TransactionList } from "@/components/screens/TransactionList";
import { AddTransactionModal } from "@/components/ui/AddTransactionModal";
import type { RecentTransactions, SpendingSummary } from "@/lib/types";

const DOT_COLORS: Record<string, string> = {
  Food: "bg-amber-500",
  Transport: "bg-blue-500",
  Shopping: "bg-purple-500",
  Entertainment: "bg-rose-500",
  Bills: "bg-emerald-500",
  Others: "bg-slate-400",
};

export default function MoneyPage() {
  const [spending, setSpending] = useState<SpendingSummary | null>(null);
  const [recent, setRecent] = useState<RecentTransactions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([getSpendingByCategory(), getRecentTransactions()])
      .then(([s, r]) => {
        setSpending(s);
        setRecent(r);
        setError(null);
      })
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load financial records"));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header onOpenAdd={() => setIsAddOpen(true)} />
        <Card className="mt-8 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!spending || !recent) {
    return (
      <div className="px-5 pb-4">
        <Header onOpenAdd={() => setIsAddOpen(true)} />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-10 rounded-xl bg-muted-bg" />
          <div className="h-44 rounded-2xl bg-muted-bg" />
          <div className="h-44 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 relative">
      <Header onOpenAdd={() => setIsAddOpen(true)} />

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground px-1 py-1">
          <Icon name="calendar" size={14} className="text-primary" />
          {spending.monthLabel}
        </span>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Icon name="plus" size={14} />
          <span>Add Record</span>
        </button>
      </div>

      {/* Spending Donut & Category Breakdown */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Spending by Category
          </h2>
          <span className="text-xs font-bold text-foreground font-mono">
            Total: {formatINR(spending.total / 100)}
          </span>
        </div>
        <Card className="p-4 flex items-center gap-4">
          <SpendingDonut data={spending.byCategory} total={spending.total} />
          <div className="min-w-0 flex-1 space-y-2.5">
            {spending.byCategory.length === 0 ? (
              <p className="text-xs text-muted">No expenses recorded for this period</p>
            ) : (
              spending.byCategory.map((item) => (
                <div key={item.category} className="flex items-center gap-2 text-xs">
                  <CategoryDot colorClass={DOT_COLORS[item.category] || "bg-primary"} size={8} />
                  <span className="flex-1 truncate text-foreground font-medium">{item.category}</span>
                  <span className="font-bold text-foreground font-mono">{formatINR(item.amount / 100)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* Recent Transactions List */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Recent Activity
          </h2>
          <span className="text-[11px] text-muted font-medium">
            {recent.items.length} records
          </span>
        </div>

        {recent.items.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted-bg text-muted">
              <Icon name="receipt" size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No Transactions Yet</p>
              <p className="text-xs text-muted mt-1 max-w-[240px] mx-auto">
                Add an expense manually or connect your bank via Setu Account Aggregator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
            >
              <Icon name="plus" size={14} />
              Add First Transaction
            </button>
          </Card>
        ) : (
          <TransactionList items={recent.items} />
        )}
      </section>

      <AddTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={fetchData}
      />
    </div>
  );
}

function Header({ onOpenAdd }: { onOpenAdd: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Money & Cashflow</h1>
        <p className="text-xs text-muted mt-0.5">Track, categorize, and control your daily spend</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenAdd}
          aria-label="Add transaction"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary hover:scale-105 transition-transform cursor-pointer"
        >
          <Icon name="plus" size={18} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
