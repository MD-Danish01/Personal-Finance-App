"use client";

import { useEffect, useState } from "react";
import { getInsights } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { InsightCard } from "@/components/screens/InsightCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { InsightsBundle } from "@/lib/types";

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightsBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInsights()
      .then(setInsights)
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load insights"));
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <p className="mt-10 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-2xl bg-muted/50" />
            <div className="h-28 rounded-2xl bg-muted/50" />
          </div>
          <div className="h-20 rounded-2xl bg-muted/50" />
          <div className="h-20 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <Header />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-brand-orange-soft p-4">
          <div className="text-xs text-orange-800">Spending trend</div>
          <div className="mt-3 flex items-center gap-1 text-2xl font-semibold text-orange-800">
            <span aria-hidden>↑</span>{formatPercent(insights.spendingTrend.value)}
          </div>
          <div className="mt-1 text-xs text-orange-800/80">{insights.spendingTrend.vsLabel}</div>
        </div>
        <div className="rounded-2xl bg-brand-green-soft p-4">
          <div className="text-xs text-green-800">Savings rate</div>
          <div className="mt-3 text-2xl font-semibold text-green-950">
            {formatPercent(insights.savingsRate.value)}
          </div>
          <div className="mt-1 text-xs text-green-800/80">{insights.savingsRate.label}</div>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        {insights.items.length === 0 ? (
          <p className="text-center text-sm text-muted py-8">
            No insights yet. Connect your bank and add transactions to get insights.
          </p>
        ) : (
          insights.items.map((item) => (
            <InsightCard
              key={item.id}
              text={item.description}
              tone={item.tone}
              variant="row"
            />
          ))
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <h1 className="text-[22px] font-bold tracking-tight">Insights for you</h1>
      <UserAvatar />
    </header>
  );
}
