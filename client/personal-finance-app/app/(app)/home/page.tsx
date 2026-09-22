"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Card } from "@/components/ui/Card";
import { SafeToSpendCard } from "@/components/screens/SafeToSpendCard";
import { MonthOverviewList } from "@/components/screens/MonthOverviewList";
import { GoalProgressCard } from "@/components/screens/GoalProgressCard";
import { InsightCard } from "@/components/screens/InsightCard";
import { FinancialAdvisorModal } from "@/components/ai/FinancialAdvisorModal";
import { OverspendWarningModal } from "@/components/ui/OverspendWarningModal";
import type { DashboardSummary } from "@/lib/types";

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      const todayStr = new Date().toISOString().slice(0, 10);
      return sessionStorage.getItem(`overspend_dismissed_${todayStr}`) === "true";
    }
    return false;
  });

  const handleDismissWarning = () => {
    setWarningDismissed(true);
    if (typeof window !== "undefined") {
      const todayStr = new Date().toISOString().slice(0, 10);
      sessionStorage.setItem(`overspend_dismissed_${todayStr}`, "true");
    }
  };

  useEffect(() => {
    let ignore = false;

    getDashboard()
      .then(({ data }) => {
        if (!ignore) {
          setDashboard(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(
            e.response?.data?.error ??
              "Failed to load dashboard data"
          );
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  /* ---------------- ERROR STATE ---------------- */

  if (error) {
    return (
      <div className="spendly-home pb-8">
        <Header
          name="Friend"
          onOpenAI={() => setAdvisorOpen(true)}
        />

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

        <FinancialAdvisorModal
          open={advisorOpen}
          onClose={() => setAdvisorOpen(false)}
        />
      </div>
    );
  }

  /* ---------------- LOADING STATE ---------------- */

  if (!dashboard) {
    return (
      <div className="spendly-home pb-8">
        <Header
          name=""
          onOpenAI={() => setAdvisorOpen(true)}
        />

        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-32 rounded-3xl bg-muted-bg" />
          <div className="h-44 rounded-2xl bg-muted-bg" />
          <div className="h-24 rounded-2xl bg-muted-bg" />
        </div>

        <FinancialAdvisorModal
          open={advisorOpen}
          onClose={() => setAdvisorOpen(false)}
        />
      </div>
    );
  }

  const userName = dashboard.greetingName;

  /* ---------------- MAIN DASHBOARD ---------------- */

return (
  <div className="spendly-home home-dashboard pb-8">

      {/* ================= HEADER ================= */}

      <div
        className="dashboard-enter"
        style={{ animationDelay: "0ms" }}
      >
        <Header
          name={userName}
          onOpenAI={() => setAdvisorOpen(true)}
        />
      </div>

      {/* ================= SAFE TO SPEND ================= */}

      <div
        className="home-hero dashboard-enter"
        style={{ animationDelay: "100ms" }}
      >
        <SafeToSpendCard
          amount={dashboard.safeToSpendToday}
          todayDesignated={dashboard.todayDesignated}
          todaySpent={dashboard.todaySpent}
          isOverDailyBudget={dashboard.isOverDailyBudget}
          overspentAmount={dashboard.overspentAmount}
          subtitle={dashboard.safeToSpendSubtitle}
        />
      </div>

      {/* ================= BUDGET + GOAL ================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

        {/* MONTH BUDGET */}

        <section
          className="home-budget dashboard-enter"
          style={{ animationDelay: "200ms" }}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              This Month&apos;s Budget Allocation
            </h2>

            <Link
              href="/money"
              className="home-section-link text-xs font-bold text-primary"
            >
              <span>View all</span>
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          {dashboard.overview.length > 0 ? (
            <MonthOverviewList rows={dashboard.overview} />
          ) : (
            <Card className="space-y-2 p-5 text-center">
              <p className="text-xs text-muted">
                Configure your income in Profile to generate monthly budget
                targets.
              </p>

              <Link
                href="/profile"
                className="inline-block text-xs font-bold text-primary hover:underline"
              >
                Setup Income →
              </Link>
            </Card>
          )}
        </section>

        {/* PRIORITY GOAL */}

        {dashboard.topGoal && (
          <section
            className="home-goal dashboard-enter"
            style={{ animationDelay: "300ms" }}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Priority Goal
              </h2>

              <Link
                href="/goals"
                className="home-section-link text-xs font-bold text-primary"
              >
                <span>All Goals</span>
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            <GoalProgressCard
              name={dashboard.topGoal.name}
              icon={dashboard.topGoal.icon}
              current={dashboard.topGoal.current}
              target={dashboard.topGoal.target}
              colorClass="bg-primary"
            />
          </section>
        )}
      </div>

      {/* ================= DAILY GUIDANCE ================= */}

      <section
        className="home-guidance dashboard-enter"
        style={{ animationDelay: "400ms" }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Daily Guidance
          </h2>

          <button
            type="button"
            onClick={() => setAdvisorOpen(true)}
            className="home-ask-copilot flex cursor-pointer items-center gap-1 text-xs font-bold text-primary"
          >
            <Icon name="sparkles" size={13} />
            <span>Ask Copilot</span>
          </button>
        </div>

        <InsightCard
          text={dashboard.insight.text}
          tone={dashboard.insight.tone}
        />
      </section>

      {/* ================= MONTHLY SPENDING ================= */}

      <div
  className="home-month-spent dashboard-enter"
  style={{ animationDelay: "500ms" }}
>
  <span className="home-month-spent-dot" aria-hidden="true" />

  <p className="font-mono text-[11px] text-muted">
    ₹{dashboard.monthSpent.toLocaleString("en-IN")} spent this month
  </p>
</div>

      {/* ================= AI MODAL ================= */}

      <FinancialAdvisorModal
        open={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
      />

      {/* ================= OVERSPENDING WARNING POPUP ================= */}

      <OverspendWarningModal
        open={Boolean(dashboard.isOverDailyBudget && !warningDismissed)}
        onClose={handleDismissWarning}
        todaySpent={dashboard.todaySpent ?? 0}
        todayDesignated={dashboard.todayDesignated ?? 0}
        overspentAmount={dashboard.overspentAmount ?? 0}
        newDailySafeToSpend={dashboard.newDailySafeToSpend}
        onOpenAdvisor={() => setAdvisorOpen(true)}
      />
    </div>
  );
}

/* ---------------- HEADER ---------------- */

function Header({
  name,
  onOpenAI,
}: {
  name: string;
  onOpenAI: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="home-greeting text-[20px] font-extrabold tracking-tight text-foreground">
          Welcome, {name || "there"}{" "}
          <span aria-hidden="true">👋</span>
        </h1>

        <p className="mt-0.5 text-xs text-muted">
          Here is your financial snapshot for today
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Ask AI Copilot"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <Icon name="sparkles" size={16} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}