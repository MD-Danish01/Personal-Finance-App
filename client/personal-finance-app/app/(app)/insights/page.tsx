"use client";

import { useEffect, useState } from "react";
import { getInsights } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { InsightCard } from "@/components/screens/InsightCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { FinancialAdvisorModal } from "@/components/ai/FinancialAdvisorModal";
import { PurchaseSimulatorModal } from "@/components/ai/PurchaseSimulatorModal";
import type { InsightsBundle } from "@/lib/types";

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightsBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    getInsights()
      .then((data) => {
        if (!ignore) {
          setInsights(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e.response?.data?.error ?? "Failed to load insights");
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <Card className="mt-8 p-6 text-center space-y-3">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Icon name="alert-triangle" size={24} />
          </div>
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Icon name="refresh-cw" size={14} />
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-32 rounded-2xl bg-muted-bg" />
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

      {/* Financial Copilot Hero Card */}
      <Card className="p-5 space-y-3.5 border-card-border bg-card shadow-xs relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name="sparkles" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Financial Decision Copilot</h2>
              <p className="text-xs text-muted">Real-time answers grounded in your budget & goals</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-foreground/80 leading-relaxed">
          Ask questions about your cashflow, check if you can afford prospective purchases, or get personalized budget recovery advice.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAdvisorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Icon name="sparkles" size={14} />
            <span>Ask Financial Copilot</span>
          </button>

          <button
            type="button"
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted-bg border border-card-border hover:bg-card-border/40 text-foreground text-xs font-bold transition-colors cursor-pointer"
          >
            <Icon name="calculator" size={14} className="text-primary" />
            <span>Can I Afford This?</span>
          </button>
        </div>
      </Card>

      {/* KPI Trend Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-amber-500/10 border-amber-500/20 text-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Spending Trend
            </span>
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

      {/* Modals */}
      <FinancialAdvisorModal
        open={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
      />

      <PurchaseSimulatorModal
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
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
