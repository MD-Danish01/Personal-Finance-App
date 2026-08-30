"use client";

import { useEffect, useState, useCallback } from "react";
import { getGoals } from "@/lib/api";
import { formatINR, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GoalCreateModal } from "@/components/ui/GoalCreateModal";
import { GoalEditModal } from "@/components/ui/GoalEditModal";
import { GoalContributeModal } from "@/components/ui/GoalContributeModal";
import type { Goal } from "@/lib/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const loadGoals = useCallback(() => {
    getGoals()
      .then(setGoals)
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load goals"));
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  if (error) {
    return (
      <div className="px-5 pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <Card className="mt-8 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={loadGoals}
            className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!goals) {
    return (
      <div className="px-5 pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-32 rounded-2xl bg-muted-bg" />
          <div className="h-32 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-8">
      <Header onAdd={() => setShowCreate(true)} />

      {goals.length === 0 ? (
        <Card className="mt-6 p-8 text-center space-y-4">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-3xl shadow-xs">
            🎯
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">No Goals Created Yet</h3>
            <p className="mt-1 text-xs text-muted max-w-[260px] mx-auto">
              Set clear targets for emergency funds, vacations, gadgets, or investments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Icon name="plus" size={14} />
            Create First Goal
          </button>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {goals.map((goal) => {
            const progress = goal.targetAmount
              ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <Card key={goal.id} className="p-4 space-y-3 hover:border-card-border/90 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted-bg text-2xl shadow-xs">
                    {goal.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{goal.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : goal.status === "at_risk"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-primary-soft text-primary border border-primary-soft-border"
                          }`}
                        >
                          {isCompleted ? "COMPLETED" : goal.status === "at_risk" ? "AT RISK" : "ON TRACK"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingGoal(goal)}
                          aria-label={`Edit ${goal.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-muted-bg text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Icon name="swap" size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <ProgressBar
                        value={goal.currentAmount}
                        max={goal.targetAmount}
                        colorClass={isCompleted ? "bg-emerald-500" : "bg-primary"}
                      />
                    </div>
                  </div>
                </div>

                {/* Numbers breakdown */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-card-border">
                  <div>
                    <span className="text-muted text-[11px] block">Saved</span>
                    <span className="font-bold text-foreground">{formatINR(goal.currentAmount / 100)}</span>
                    <span className="text-muted text-[10px]"> / {formatINR(goal.targetAmount / 100)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted text-[11px] block">Progress</span>
                    <span className="font-bold text-primary">{formatPercent(progress)}</span>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted">
                    {goal.monthlyTarget > 0 ? (
                      <>Target: <span className="font-semibold text-foreground">{formatINR(goal.monthlyTarget / 100)}</span>/mo</>
                    ) : (
                      goal.deadline ? `Target: ${goal.deadline}` : "Ongoing savings"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingGoal(goal)}
                      className="px-2.5 py-1 rounded-xl bg-muted-bg hover:bg-card-border/40 text-muted hover:text-foreground text-xs font-semibold transition-colors cursor-pointer border border-card-border"
                    >
                      Edit
                    </button>
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => setContributeGoal(goal)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs"
                      >
                        <Icon name="plus" size={13} />
                        <span>Deposit</span>
                      </button>
                    )}
                  </div>
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

      <GoalEditModal
        goal={editingGoal}
        open={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onUpdated={loadGoals}
      />

      <GoalContributeModal
        goal={contributeGoal}
        open={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        onContributed={loadGoals}
      />
    </div>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Savings Goals</h1>
        <p className="text-xs text-muted mt-0.5">Build disciplined wealth toward milestones</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Add goal"
          onClick={onAdd}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary hover:scale-105 transition-transform cursor-pointer"
        >
          <Icon name="plus" size={18} />
        </button>
        <UserAvatar />
      </div>
    </header>
  );
}
