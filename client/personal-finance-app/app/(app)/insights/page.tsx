import { getInsights } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { InsightCard } from "@/components/screens/InsightCard";

export default async function InsightsPage() {
  const insights = await getInsights();

  return (
    <div className="px-5 pb-4">
      <header className="px-1 py-5">
        <h1 className="text-[22px] font-bold tracking-tight">Insights for you</h1>
      </header>

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
        {insights.items.map((item) => (
          <InsightCard key={item.id} text={item.description} tone={item.tone} variant="row" />
        ))}
      </section>
    </div>
  );
}
