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
import { EditTransactionModal } from "@/components/ui/EditTransactionModal";
import type { RecentTransactions, SpendingSummary, Transaction } from "@/lib/types";

const DOT_COLORS: Record<string, string> = {
  Food: "bg-amber-500",
  Transport: "bg-blue-500",
  Shopping: "bg-purple-500",
  Entertainment: "bg-rose-500",
  Bills: "bg-emerald-500",
  Others: "bg-slate-400",
};

type RecentItem = Transaction & { relativeDate: string };

export default function MoneyPage() {
  const [spending, setSpending] = useState<SpendingSummary | null>(null);
  const [recent, setRecent] = useState<RecentTransactions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecentItem | null>(null);

  const fetchData = useCallback(() => {
    Promise.all([getSpendingByCategory(), getRecentTransactions()])
      .then(([s, r]) => {
        setSpending(s.data);
        setRecent(r.data);
        setError(null);
      })
      .catch((e) =>
        setError(
          e.response?.data?.error ??
            "Failed to load financial records"
        )
      );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="pb-4">
        <Header onOpenAdd={() => setIsAddOpen(true)} />

        <Card className="money-error-card mt-8 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>

          <button
            type="button"
            onClick={fetchData}
            className="mt-3 cursor-pointer text-xs font-bold text-primary hover:underline"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!spending || !recent) {
    return (
      <div className="pb-4">
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
    <div className="money-page relative pb-8">
      {/* HEADER */}

      <div
        className="dashboard-enter"
        style={{ animationDelay: "0ms" }}
      >
        <Header onOpenAdd={() => setIsAddOpen(true)} />
      </div>

      {/* MONTH + ADD RECORD */}

      <div
        className="money-month-bar dashboard-enter"
        style={{ animationDelay: "100ms" }}
      >
        <span className="flex items-center gap-1.5 px-1 py-1 text-xs font-bold text-foreground">
          <Icon
            name="calendar"
            size={14}
            className="text-primary"
          />

          {spending.monthLabel}
        </span>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="money-add-button flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs"
        >
          <Icon name="plus" size={14} />
          <span>Add Record</span>
        </button>
      </div>

      {/* SPENDING BY CATEGORY */}

      <section
        className="mt-4 dashboard-enter"
        style={{ animationDelay: "180ms" }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Spending by Category
          </h2>

          <span className="text-xs font-bold font-mono text-foreground">
            Total: {formatINR(spending.total / 100)}
          </span>
        </div>

        <Card className="money-spending-card flex items-center gap-4 overflow-hidden p-4">
          <div className="money-donut">
            <SpendingDonut
              data={spending.byCategory}
              total={spending.total}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            {spending.byCategory.length === 0 ? (
              <p className="text-xs text-muted">
                No expenses recorded for this period
              </p>
            ) : (
              spending.byCategory.map((item, index) => (
                <div
                  key={item.category}
                  className="money-category-row flex items-center gap-2"
                  style={{
                    animationDelay: `${250 + index * 60}ms`,
                  }}
                >
                  <CategoryDot
                    colorClass={
                      DOT_COLORS[item.category] || "bg-primary"
                    }
                    size={8}
                  />

                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {item.category}
                  </span>

                  <span className="shrink-0 font-mono text-xs font-bold text-foreground">
                    {formatINR(item.amount / 100)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* RECENT TRANSACTIONS */}

      <section
        className="mt-6 dashboard-enter"
        style={{ animationDelay: "350ms" }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Recent Activity
          </h2>

          <span className="text-[11px] font-medium text-muted">
            {recent.items.length} records
          </span>
        </div>

        {recent.items.length === 0 ? (
          <Card className="money-empty-card space-y-3 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted-bg text-muted">
              <Icon name="receipt" size={24} />
            </div>

            <div>
              <p className="text-sm font-bold text-foreground">
                No Transactions Yet
              </p>

              <p className="mx-auto mt-1 max-w-[240px] text-xs text-muted">
                Add an expense manually or connect your bank via Setu
                Account Aggregator.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="money-first-transaction inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              <Icon name="plus" size={14} />
              Add First Transaction
            </button>
          </Card>
        ) : (
          <div className="money-transactions">
            <TransactionList
              items={recent.items}
              onEdit={(item) => setEditingTransaction(item)}
            />
          </div>
        )}
      </section>

      {/* ADD TRANSACTION MODAL */}

      <AddTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={fetchData}
      />

      {/* EDIT TRANSACTION MODAL */}

      <EditTransactionModal
        open={editingTransaction !== null}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={() => {
          setEditingTransaction(null);
          fetchData();
        }}
      />
    </div>
  );
}

function Header({ onOpenAdd }: { onOpenAdd: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          Money & Cashflow
        </h1>

        <p className="mt-0.5 text-xs text-muted">
          Track, categorize, and control your daily spend
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenAdd}
          aria-label="Add transaction"
          className="money-header-add flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-primary-soft text-primary"
        >
          <Icon name="plus" size={18} />
        </button>

        <UserAvatar />
      </div>
    </header>
  );
}