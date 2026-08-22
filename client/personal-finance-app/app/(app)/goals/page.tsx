import { getGoals } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <div className="px-5 pb-4">
      <header className="flex items-center justify-between px-1 py-5">
        <h1 className="text-[22px] font-bold tracking-tight">My Goals</h1>
        <button aria-label="Add goal" className="rounded-full p-1">
          <Icon name="plus" size={23} />
        </button>
      </header>

      <div className="space-y-3">
        {goals.map((goal) => {
          const progress = goal.targetAmount
            ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
            : 0;
          return (
            <Card key={goal.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${goal.iconBgClass}`}>
                  {goal.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{goal.name}</span>
                    <span className="text-xs font-semibold text-muted">{formatPercent(progress)}</span>
                  </div>
                  <ProgressBar value={goal.currentAmount} max={goal.targetAmount} colorClass={goal.iconBgClass.replace("-soft", "")} className="mt-2" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{formatINR(goal.currentAmount)} / {formatINR(goal.targetAmount)}</span>
                <span>Target: {goal.deadline}</span>
              </div>
              <div className="mt-2 text-xs text-muted">
                Save <span className="font-semibold text-foreground">{formatINR(goal.monthlyTarget)}</span> / month
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
