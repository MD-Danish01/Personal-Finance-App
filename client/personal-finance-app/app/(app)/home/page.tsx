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
import type { DashboardSummary } from "@/lib/types";

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getDashboard()
      .then((data) => {
        if (!ignore) {
          setDashboard(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e.response?.data?.error ?? "Failed to load dashboard data");
        }
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header name="Friend" />
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

  if (!dashboard) {
    return (
      <div className="px-5 pb-4">
        <Header name="" />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-32 rounded-3xl bg-muted-bg" />
          <div className="h-44 rounded-2xl bg-muted-bg" />
          <div className="h-24 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  const userName = dashboard.greetingName;

  return (
    <div className="px-5 pb-8 space-y-6">
      <Header name={userName} />

      <SafeToSpendCard
        amount={dashboard.safeToSpendToday}
        subtitle={dashboard.safeToSpendSubtitle}
      />

      {/* Overview Breakdown */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            This Month&apos;s Budget Allocation
          </h2>
          <Link href="/money" className="text-xs font-bold text-primary hover:underline">
            View all
          </Link>
        </div>
        {dashboard.overview.length > 0 ? (
          <MonthOverviewList rows={dashboard.overview} />
        ) : (
          <Card className="p-5 text-center space-y-2">
            <p className="text-xs text-muted">
              Configure your income in Profile to generate monthly budget targets.
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

      {/* Top Goal */}
      {dashboard.topGoal && (
        <section>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Priority Goal
            </h2>
            <Link href="/goals" className="text-xs font-bold text-primary hover:underline">
              All Goals
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

      {/* Smart Insight */}
      <section>
        <div className="mb-2.5 px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Daily Guidance
          </h2>
        </div>
        <InsightCard text={dashboard.insight.text} tone={dashboard.insight.tone} />
      </section>

      <p className="text-center text-[11px] text-muted font-mono">
        ₹{dashboard.monthSpent.toLocaleString("en-IN")} spent this month
      </p>
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[20px] font-extrabold tracking-tight text-foreground">
          Good morning, {name || "there"} <span aria-hidden>👋</span>
        </h1>
        <p className="text-xs text-muted mt-0.5">Here is your financial snapshot for today</p>
      </div>
      <div className="flex items-center gap-3">
        <UserAvatar />
      </div>
    </header>
  );
}
