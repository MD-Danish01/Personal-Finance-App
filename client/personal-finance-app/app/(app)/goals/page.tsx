"use client";

import { useEffect, useState } from "react";
import { getGoals } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GoalCreateModal } from "@/components/ui/GoalCreateModal";
import type { Goal } from "@/lib/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadGoals = () => {
    getGoals()
      .then(setGoals)
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load goals"));
  };

  useEffect(() => {
    loadGoals();
  }, []);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <p className="mt-10 text-center text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (!goals) {
    return (
      <div className="px-5 pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-muted/50" />
          <div className="h-24 rounded-2xl bg-muted/50" />
          <div className="h-24 rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <Header onAdd={() => setShowCreate(true)} />

      {goals.length === 0 ? (
        <div className="mt-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple-soft text-3xl">
            🎯
          </span>
          <p className="mt-4 text-sm font-medium">No goals yet</p>
          <p className="mt-1 text-xs text-muted">
            Create your first savings goal to start tracking progress.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-brand-blue px-5 py-2 text-sm font-medium text-white"
          >
            Create goal
          </button>
        </div>
      ) : (
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
                    <ProgressBar
                      value={goal.currentAmount}
                      max={goal.targetAmount}
                      colorClass={goal.iconBgClass.replace("-soft", "")}
                      className="mt-2"
                    />
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
      )}

      <GoalCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadGoals}
      />
    </div>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <h1 className="text-[22px] font-bold tracking-tight">My Goals</h1>
      <div className="flex items-center gap-4">
        <button
          aria-label="Add goal"
          className="rounded-full p-1"
          onClick={onAdd}
        >
          <Icon name="plus" size={23} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
