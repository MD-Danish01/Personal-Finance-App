import { getPlan } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { PlanBreakdownRow } from "@/components/screens/PlanBreakdownRow";
import { InsightCard } from "@/components/screens/InsightCard";

export default async function PlanPage() {
  const plan = await getPlan();

  return (
    <div className="px-5 pb-4">
      <header className="flex items-center justify-between px-1 py-5">
        <h1 className="text-[22px] font-bold tracking-tight">My Plan</h1>
        <div className="flex items-center gap-4">
          <button aria-label="Adjust plan" className="rounded-full p-1">
            <Icon name="swap" size={21} />
          </button>
          <ProfileAvatar name="Aarav" />
        </div>
      </header>

      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
          <Icon name="wallet" size={19} />
        </span>
        <span className="flex-1 text-sm font-medium">Monthly income</span>
        <span className="text-sm font-bold">{formatINR(plan.monthlyIncome)}</span>
      </Card>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Plan breakdown</h2>
          <button className="text-xs font-medium text-brand-blue">Edit plan</button>
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

      <section className="mt-4 rounded-2xl border border-dashed border-brand-blue/30 bg-brand-blue-soft/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-blue">
            <Icon name="money" size={18} />
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold">Connect your bank</div>
            <div className="mt-0.5 text-xs text-muted">Bank sync is coming soon.</div>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-brand-blue">
            Soon
          </span>
        </div>
      </section>
    </div>
  );
}
