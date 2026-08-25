"use client";

import { useEffect, useState } from "react";
import { getInsights } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { InsightCard } from "@/components/screens/InsightCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
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
        <Card className="mt-8 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-2xl bg-muted-bg" />
            <div className="h-28 rounded-2xl bg-muted-bg" />
          </div>
          <div className="h-20 rounded-2xl bg-muted-bg" />
          <div className="h-20 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 space-y-6">
      <Header />

      {/* KPI Trend Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-amber-500/10 border-amber-500/20 text-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Spending Trend</span>
            <Icon name="trending-up" size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {formatPercent(insights.spendingTrend.value)}
          </div>
          <div className="text-[11px] text-muted">{insights.spendingTrend.vsLabel}</div>
        </Card>

        <Card className="p-4 bg-primary-soft border-primary-soft-border text-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">Savings Rate</span>
            <Icon name="target" size={16} className="text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {formatPercent(insights.savingsRate.value)}
          </div>
          <div className="text-[11px] text-muted">{insights.savingsRate.label}</div>
        </Card>
      </div>

      {/* Actionable Insights List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Smart Financial Guidance
          </h2>
          <span className="text-[11px] text-primary font-semibold">Live Signals</span>
        </div>

        {insights.items.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-muted-bg text-muted">
              <Icon name="sparkles" size={18} />
            </div>
            <p className="text-xs text-muted">
              No anomaly detected. Keep recording your expenses to generate deeper behavioral insights.
            </p>
          </Card>
        ) : (
          insights.items.map((item) => (
            <InsightCard
              key={item.id}
              title={item.title}
              text={item.description}
              tone={item.tone}
              variant="block"
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
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Financial Insights</h1>
        <p className="text-xs text-muted mt-0.5">Automated pattern detection & guidance</p>
      </div>
      <UserAvatar />
    </header>
  );
}
