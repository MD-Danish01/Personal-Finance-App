"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { SafeToSpendCard } from "@/components/screens/SafeToSpendCard";
import { MonthOverviewList } from "@/components/screens/MonthOverviewList";
import { GoalProgressCard } from "@/components/screens/GoalProgressCard";
import { InsightCard } from "@/components/screens/InsightCard";
import type { DashboardSummary } from "@/lib/types";

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setDashboard)
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load"));
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header name="" />
        <p className="mt-10 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="px-5 pb-4">
        <Header name="" />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-28 rounded-2xl bg-muted/50" />
          <div className="h-32 rounded-2xl bg-muted/50" />
          <div className="h-20 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  const userName = dashboard.greetingName;

  return (
    <div className="px-5 pb-4">
      <Header name={userName} />

      <SafeToSpendCard
        amount={dashboard.safeToSpendToday}
        subtitle={dashboard.safeToSpendSubtitle}
      />

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">This month overview</h2>
          <Link href="/money" className="text-xs font-medium text-brand-blue">
            View all
          </Link>
        </div>
        <MonthOverviewList rows={dashboard.overview} />
      </section>

      {dashboard.topGoal && (
        <section className="mt-3">
          <GoalProgressCard
            name={dashboard.topGoal.name}
            icon={dashboard.topGoal.icon}
            current={dashboard.topGoal.current}
            target={dashboard.topGoal.target}
            colorClass={dashboard.topGoal.colorClass}
          />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-sm font-semibold">Insight for you</h2>
        <InsightCard text={dashboard.insight.text} tone={dashboard.insight.tone} />
      </section>

      <p className="mt-5 text-center text-xs text-muted">
        {formatINR(dashboard.monthSpent)} spent this month
      </p>
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <h1 className="text-[19px] font-semibold tracking-tight">
        Good morning, {name} <span aria-hidden>👋</span>
      </h1>
      <div className="flex items-center gap-4">
        <button aria-label="Notifications" className="rounded-full p-1">
          <Icon name="bell" size={21} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
