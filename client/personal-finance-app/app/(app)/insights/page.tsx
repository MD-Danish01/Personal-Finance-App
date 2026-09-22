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
      .then(({ data }) => {
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

  /* ---------------- ERROR STATE ---------------- */

  if (error) {
    return (
      <div className="pb-4">
        <Header />

        <Card className="mt-8 space-y-3 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Icon name="alert-triangle" size={24} />
          </div>

          <p className="text-sm font-semibold text-foreground">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
          >
            <Icon name="refresh-cw" size={14} />
            Retry
          </button>
        </Card>
      </div>
    );
  }

  /* ---------------- LOADING STATE ---------------- */

  if (!insights) {
    return (
      <div className="pb-4">
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

  /* ---------------- MAIN PAGE ---------------- */

  return (
    <div className="insights-page pb-8">
      {/* ================= HEADER ================= */}

      <div
        className="dashboard-enter"
        style={{ animationDelay: "0ms" }}
      >
        <Header />
      </div>

      {/* ================= COPILOT HERO ================= */}

      <div
        className="insights-copilot dashboard-enter"
        style={{ animationDelay: "100ms" }}
      >
        <Card className="relative overflow-hidden border-card-border bg-card p-5 shadow-xs">
          {/* Ambient AI glow */}
          <div className="insights-copilot-glow pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="insights-sparkle flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name="sparkles" size={20} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Financial Decision Copilot
                  </h2>

                  <p className="text-xs text-muted">
                    Real-time answers grounded in your budget & goals
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-foreground/80">
              Ask questions about your cashflow, check if you can afford
              prospective purchases, or get personalized budget recovery
              advice.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAdvisorOpen(true)}
                className="insights-primary-button flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs"
              >
                <Icon name="sparkles" size={14} />
                <span>Ask Financial Copilot</span>
              </button>

              <button
                type="button"
                onClick={() => setSimulatorOpen(true)}
                className="insights-secondary-button flex cursor-pointer items-center gap-1.5 rounded-xl border border-card-border bg-muted-bg px-3.5 py-2 text-xs font-bold text-foreground"
              >
                <Icon
                  name="calculator"
                  size={14}
                  className="text-primary"
                />
                <span>Can I Afford This?</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ================= KPI CARDS ================= */}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {/* Spending Trend */}
        <div
          className="dashboard-enter"
          style={{ animationDelay: "200ms" }}
        >
          <Card className="insights-kpi insights-kpi-warning space-y-1 border-amber-500/20 bg-amber-500/10 p-4 text-foreground">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Spending Trend
              </span>

              <Icon
                name="trending-up"
                size={16}
                className="insights-kpi-icon text-amber-500"
              />
            </div>

            <div className="insights-kpi-value font-mono text-2xl font-extrabold text-foreground">
              {formatPercent(insights.spendingTrend.value)}
            </div>

            <div className="text-[11px] text-muted">
              {insights.spendingTrend.vsLabel}
            </div>
          </Card>
        </div>

        {/* Savings Rate */}
        <div
          className="dashboard-enter"
          style={{ animationDelay: "280ms" }}
        >
          <Card className="insights-kpi insights-kpi-primary space-y-1 border-primary-soft-border bg-primary-soft p-4 text-foreground">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">
                Savings Rate
              </span>

              <Icon
                name="target"
                size={16}
                className="insights-kpi-icon text-primary"
              />
            </div>

            <div className="insights-kpi-value font-mono text-2xl font-extrabold text-foreground">
              {formatPercent(insights.savingsRate.value)}
            </div>

            <div className="text-[11px] text-muted">
              {insights.savingsRate.label}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= GUIDANCE ================= */}

      <section
        className="mt-6 dashboard-enter"
        style={{ animationDelay: "360ms" }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Smart Financial Guidance
          </h2>

          <span className="insights-live flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <span className="insights-live-dot" />
            Live Signals
          </span>
        </div>

        {insights.items.length === 0 ? (
          <Card className="space-y-2 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted-bg text-muted">
              <Icon name="sparkles" size={18} />
            </div>

            <p className="text-xs text-muted">
              No anomaly detected. Keep recording your expenses to generate
              deeper behavioral insights.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {insights.items.map((item, index) => (
              <div
                key={item.id}
                className="dashboard-enter"
                style={{
                  animationDelay: `${420 + index * 90}ms`,
                }}
              >
                <InsightCard
                  title={item.title}
                  text={item.description}
                  tone={item.tone}
                  variant="block"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= MODALS ================= */}

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

/* ---------------- HEADER ---------------- */

function Header() {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          Financial Insights
        </h1>

        <p className="mt-0.5 text-xs text-muted">
          Automated pattern detection & guidance
        </p>
      </div>

      <UserAvatar />
    </header>
  );
}