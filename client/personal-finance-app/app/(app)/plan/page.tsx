"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getPlan } from "@/lib/api";
import { formatINR, formatRelativeTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ConnectedAccountsCard } from "@/components/ui/ConnectedAccountsCard";
import { CategoryLimitsCard } from "@/components/ui/CategoryLimitsCard";
import { EmergencyFundCard } from "@/components/ui/EmergencyFundCard";
import { EditPlanModal } from "@/components/ui/EditPlanModal";
import { PlanBreakdownRow } from "@/components/screens/PlanBreakdownRow";
import { InsightCard } from "@/components/screens/InsightCard";
import { WifiOff } from "lucide-react";
import type { Plan as PlanType } from "@/lib/types";

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadPlan = useCallback(() => {
    setError(null);
    getPlan()
      .then((result) => {
        setPlan(result.data);
        setFromCache(result.fromCache);
        setCachedAt(result.fromCache ? result.cachedAt : null);
      })
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load plan"));
  }, []);

  useEffect(() => {
    getPlan()
      .then((result) => {
        setPlan(result.data);
        setFromCache(result.fromCache);
        setCachedAt(result.fromCache ? result.cachedAt : null);
      })
      .catch((e) => {
        if (e.response?.status === 404)
          setError("Set your monthly income in Profile to generate your plan.");
        else setError(e.response?.data?.error ?? "Failed to load plan");
      });
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header onEditPlan={() => setEditing(true)} />
        <Card className="mt-8 p-6 text-center space-y-3">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon name="wallet" size={24} />
          </div>
          <p className="text-sm font-semibold text-foreground">{error}</p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
          >
            <Icon name="user" size={14} />
            Go to Profile Setup
          </Link>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-5 pb-4">
        <Header onEditPlan={() => setEditing(true)} />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-16 rounded-xl bg-muted-bg" />
          <div className="h-64 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 space-y-6">
      <Header onEditPlan={() => setEditing(true)} />

      {/* Stale-data badge */}
      {fromCache && cachedAt !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <WifiOff size={13} />
          <span>Showing offline data — last updated {formatRelativeTime(cachedAt)}</span>
        </div>
      )}

      {/* Income overview banner */}
      <Card className="flex items-center gap-3.5 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary font-bold shadow-xs">
          <Icon name="wallet" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-muted block">Planned Monthly Income</span>
          <span className="text-lg font-bold text-foreground font-mono">
            {formatINR(plan.monthlyIncome / 100)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 rounded-xl bg-muted-bg hover:bg-primary-soft hover:text-primary text-xs font-bold text-muted transition-colors cursor-pointer"
        >
          Edit Split
        </button>
      </Card>

      {/* Plan allocation breakdown */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Allocation Strategy (50/20/20/10)
          </h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Adjust
          </button>
        </div>
        <Card className="divide-y divide-card-border overflow-hidden">
          {plan.allocations.map((allocation) => (
            <PlanBreakdownRow
              key={allocation.key}
              allocation={allocation}
              totalIncome={plan.monthlyIncome}
            />
          ))}
        </Card>
      </section>

      {/* Category Spending Limits */}
      <section>
        <CategoryLimitsCard />
      </section>

      {/* Emergency Fund Runway */}
      <section>
        <EmergencyFundCard />
      </section>

      {/* Why this plan insight */}
      <section>
        <InsightCard
          title="Why this plan?"
          text={plan.whyThisPlan}
          tone="info"
          variant="row"
        />
      </section>

      {/* Connected Accounts / Bank AA */}
      <section>
        <ConnectedAccountsCard />
      </section>

      <EditPlanModal
        open={editing}
        allocations={plan.allocations}
        onClose={() => setEditing(false)}
        onSaved={loadPlan}
      />
    </div>
  );
}

function Header({ onEditPlan }: { onEditPlan: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Financial Plan</h1>
        <p className="text-xs text-muted mt-0.5">Budget allocations, limits, and safety buffers</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Adjust plan"
          onClick={onEditPlan}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary hover:scale-105 transition-transform cursor-pointer"
        >
          <Icon name="swap" size={18} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
