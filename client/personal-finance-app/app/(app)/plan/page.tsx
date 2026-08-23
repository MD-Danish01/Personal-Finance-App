"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlan } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ConnectBankCard } from "@/components/ui/ConnectBankCard";
import { EditPlanModal } from "@/components/ui/EditPlanModal";
import { PlanBreakdownRow } from "@/components/screens/PlanBreakdownRow";
import { InsightCard } from "@/components/screens/InsightCard";
import type { Plan as PlanType } from "@/lib/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function loadPlan() {
    setError(null);
    getPlan().then(setPlan).catch((e) => setError(e.response?.data?.error ?? "Failed to load plan"));
  }

  useEffect(() => {
    getPlan().then(setPlan).catch((e) => {
      if (e.response?.status === 404) setError("Set your monthly income to generate a plan.");
      else setError(e.response?.data?.error ?? "Failed to load plan");
    });
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <Card className="mt-6 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>
          <Link
            href="/profile"
            className="mt-3 inline-block text-sm font-medium text-brand-blue"
          >
            Go to profile to set income
          </Link>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-5 pb-4">
        <Header />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-16 rounded-xl bg-muted/50" />
          <div className="h-64 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <Header />

      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
          <Icon name="wallet" size={19} />
        </span>
        <span className="flex-1 text-sm font-medium">Monthly income</span>
        <span className="text-sm font-bold">{formatINR(plan.monthlyIncome / 100)}</span>
      </Card>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Plan breakdown</h2>
          <button onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-soft focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
            Edit plan
          </button>
        </div>
        <Card className="divide-y divide-border/60 overflow-hidden">
          {plan.allocations.map((allocation) => (
            <PlanBreakdownRow
              key={allocation.key}
              allocation={allocation}
              totalIncome={plan.monthlyIncome}
            />
          ))}
        </Card>
      </section>

      <section className="mt-6">
        <InsightCard
          title="Why this plan?"
          text={plan.whyThisPlan}
          tone="info"
          variant="row"
        />
      </section>

      <ConnectBankCard />
      <EditPlanModal open={editing} allocations={plan.allocations} onClose={() => setEditing(false)} onSaved={loadPlan} />
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <h1 className="text-[22px] font-bold tracking-tight">My Plan</h1>
      <div className="flex items-center gap-4">
        <button aria-label="Adjust plan" className="rounded-full p-1 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
          <Icon name="swap" size={21} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
