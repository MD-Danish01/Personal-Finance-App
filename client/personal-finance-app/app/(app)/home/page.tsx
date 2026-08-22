import Link from "next/link";
import { getDashboard } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { SafeToSpendCard } from "@/components/screens/SafeToSpendCard";
import { MonthOverviewList } from "@/components/screens/MonthOverviewList";
import { GoalProgressCard } from "@/components/screens/GoalProgressCard";
import { InsightCard } from "@/components/screens/InsightCard";

export default async function HomePage() {
  const dashboard = await getDashboard();
  const userName = dashboard.greetingName;

  return (
    <div className="px-5 pb-4">
      <header className="flex items-center justify-between px-1 py-5">
        <h1 className="text-[19px] font-semibold tracking-tight">
          Good morning, {userName} <span aria-hidden>👋</span>
        </h1>
        <div className="flex items-center gap-4">
          <button aria-label="Notifications" className="rounded-full p-1">
            <Icon name="bell" size={21} />
          </button>
          <ProfileAvatar name={userName} />
        </div>
      </header>

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

      <section className="mt-3">
        <GoalProgressCard
          name={dashboard.topGoal.name}
          icon={dashboard.topGoal.icon}
          current={dashboard.topGoal.current}
          target={dashboard.topGoal.target}
          colorClass={dashboard.topGoal.colorClass}
        />
      </section>

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
