"use client";

import { useEffect, useState, useCallback } from "react";
import { getGoals, getGoalCapacity, getGoalRebalancePlan } from "@/lib/api";
import { formatINR, formatPercent, formatRelativeTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GoalCreateModal } from "@/components/ui/GoalCreateModal";
import { GoalEditModal } from "@/components/ui/GoalEditModal";
import { GoalContributeModal } from "@/components/ui/GoalContributeModal";
import { GoalRebalanceModal } from "@/components/ui/GoalRebalanceModal";
import { WifiOff, Zap, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import type { Goal, GoalCapacityInfo, RebalancePlan } from "@/lib/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [capacity, setCapacity] = useState<GoalCapacityInfo | null>(null);
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlan | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRebalance, setShowRebalance] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const loadData = useCallback(() => {
    getGoals()
      .then((result) => {
        setGoals(result.data);
        setFromCache(result.fromCache);
        setCachedAt(result.fromCache ? result.cachedAt : null);
        setError(null);
      })
      .catch((e) => setError(e.response?.data?.error ?? "Failed to load goals"));

    getGoalCapacity()
      .then((cap) => setCapacity(cap))
      .catch((err) => console.error("Failed to load goal capacity:", err));

    getGoalRebalancePlan()
      .then((plan) => setRebalancePlan(plan))
      .catch((err) => console.error("Failed to load rebalance plan:", err));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <div className="pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <Card className="mt-8 p-6 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={loadData}
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
      <div className="pb-4">
        <Header onAdd={() => setShowCreate(true)} />
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-28 rounded-2xl bg-muted-bg" />
          <div className="h-36 rounded-2xl bg-muted-bg" />
          <div className="h-36 rounded-2xl bg-muted-bg" />
        </div>
      </div>
    );
  }

  const hasMultipleGoals = goals.filter((g) => g.status !== "completed").length >= 2;
  const isOverAllocated = rebalancePlan?.isOverAllocated ?? false;

  return (
    <div className="goals-page pb-8 space-y-4">
      <div
        className="dashboard-enter"
        style={{ animationDelay: "0ms" }}
      >
        <Header onAdd={() => setShowCreate(true)} />
      </div>

      {/* Stale-data badge */}
      {fromCache && cachedAt !== null && (
        <div
          className="dashboard-enter flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
          style={{ animationDelay: "40ms" }}
        >
          <WifiOff size={13} />
          <span>Showing offline data — last updated {formatRelativeTime(cachedAt)}</span>
        </div>
      )}

      {/* Master Capacity & Auto-Allocation Overview Card */}
      {capacity && capacity.hasIncome && (
        <div
          className="dashboard-enter"
          style={{ animationDelay: "80ms" }}
        >
          <Card className="goals-capacity-card p-4 sm:p-5 bg-gradient-to-br from-card via-card to-primary-soft/10 border-card-border shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>Income-Protected Goals Engine</span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Every month, your allocated goal money is automatically reserved to safeguard daily essentials.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-[11px] shrink-0 transition-transform duration-200 hover:scale-105">
                  <Zap size={12} className="fill-primary" />
                  <span>Auto-Allocating</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-card-border/60 text-center">
              <div className="goals-capacity-stat p-2 rounded-xl bg-muted-bg/60">
                <span className="text-[10px] text-muted block uppercase font-semibold">Committed</span>
                <span className="text-xs sm:text-sm font-bold text-foreground font-mono">
                  {formatINR(capacity.existingMonthlyCommitmentRupees)}
                  <span className="text-[10px] text-muted font-normal">/mo</span>
                </span>
              </div>

              <div className="goals-capacity-stat p-2 rounded-xl bg-muted-bg/60">
                <span className="text-[10px] text-muted block uppercase font-semibold">Safe Ceiling</span>
                <span className="text-xs sm:text-sm font-bold text-foreground font-mono">
                  {formatINR(capacity.maxAllowedMonthlyRupees)}
                  <span className="text-[10px] text-muted font-normal">/mo</span>
                </span>
              </div>

              <div className="goals-capacity-stat p-2 rounded-xl bg-muted-bg/60">
                <span className="text-[10px] text-muted block uppercase font-semibold">Active Goals</span>
                <span className="text-xs sm:text-sm font-bold text-primary font-mono">
                  {capacity.activeGoalsCount} / {capacity.maxGoalsCount}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* AI Smart Rebalancing Suggestion Card */}
      {rebalancePlan && (isOverAllocated || (hasMultipleGoals && rebalancePlan.recommendations.length > 0)) && (
        <div
          className="dashboard-enter"
          style={{ animationDelay: "150ms" }}
        >
          <div
            className={`goals-rebalance-banner rounded-2xl p-4 border transition-all duration-200 ${
              isOverAllocated
                ? "bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200"
                : "bg-primary/5 border-primary/20 text-foreground"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                  {isOverAllocated ? (
                    <>
                      <AlertTriangle size={15} className="text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">
                        AI Allocation Alert: High Daily Pressure
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} className="text-primary" />
                      <span className="text-primary">
                        AI Goal Rebalancing Opportunity
                      </span>
                    </>
                  )}
                </div>

                <p className="text-xs text-muted leading-relaxed max-w-xl">
                  {isOverAllocated ? (
                    <>
                      Aapne total <strong>{formatINR(rebalancePlan.currentTotalMonthlyCommitmentRupees)}/mo</strong> goals me allocate kiya hai, jo aapke safe envelope ko exceed kar raha hai. AI recommends rebalancing your goals to free up <strong>{formatINR(rebalancePlan.monthlySavingsFreedRupees)}/month</strong> (<span className="text-emerald-600 dark:text-emerald-400 font-bold">+{formatINR(rebalancePlan.dailySafeToSpendGainRupees)}/day</span> extra Safe-to-Spend).
                    </>
                  ) : (
                    <>
                      AI can intelligently balance monthly targets across your {goals.filter((g) => g.status !== "completed").length} active goals based on urgency, horizons, and income math.
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRebalance(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                <Sparkles size={13} />
                <span>{isOverAllocated ? "Rebalance with AI" : "Optimize Allocations"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div
          className="dashboard-enter"
          style={{ animationDelay: "200ms" }}
        >
          <Card className="p-8 text-center space-y-4">
            <span className="goal-empty-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-3xl shadow-xs">
              🎯
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">No Goals Created Yet</h3>
              <p className="mt-1 text-xs text-muted max-w-65 mx-auto">
                Set clear milestones for emergency funds, vacations, gadgets, or investments with automated monthly contributions.
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
        </div>
      ) : (
        <div className="space-y-3.5">
          {goals.map((goal, index) => {
            const progress = goal.targetAmount
              ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                className="dashboard-enter"
                style={{ animationDelay: `${200 + index * 60}ms` }}
              >
                <Card className="goal-item-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="goal-item-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted-bg text-2xl shadow-xs">
                      {goal.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <h3 className="text-sm font-bold text-foreground truncate">{goal.name}</h3>
                          {goal.autoAllocatedThisMonth && !isCompleted && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0 border border-emerald-500/20">
                              <Zap size={10} className="fill-emerald-500" />
                              <span>Auto-Deposited</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-transform duration-200 hover:scale-105 ${
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
                            className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-muted-bg text-muted hover:text-foreground transition-all duration-200 hover:scale-110 cursor-pointer"
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
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-card-border font-mono">
                    <div>
                      <span className="text-muted text-[11px] block font-sans">Saved</span>
                      <span className="font-bold text-foreground">{formatINR(goal.currentAmount / 100)}</span>
                      <span className="text-muted text-[10px]"> / {formatINR(goal.targetAmount / 100)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted text-[11px] block font-sans">Progress</span>
                      <span className="font-bold text-primary">{formatPercent(progress)}</span>
                    </div>
                  </div>

                  {/* Footer action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted">
                        {goal.monthlyTarget > 0 ? (
                          <>Monthly Auto: <span className="font-semibold text-foreground font-mono">{formatINR(goal.monthlyTarget / 100)}</span>/mo</>
                        ) : (
                          goal.deadline ? `Target: ${goal.deadline}` : "Ongoing savings"
                        )}
                      </span>
                      {goal.monthlyTarget > 0 && !isCompleted && (
                        <span className="text-[10px] text-primary/80 font-medium">
                          Deducted from Safe-to-Spend automatically
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingGoal(goal)}
                        className="px-2.5 py-1 rounded-xl bg-muted-bg hover:bg-card-border/40 text-muted hover:text-foreground text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-card-border"
                      >
                        Edit
                      </button>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => setContributeGoal(goal)}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                        >
                          <Icon name="plus" size={13} />
                          <span>Manual Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <GoalCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
      />

      <GoalEditModal
        goal={editingGoal}
        open={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onUpdated={loadData}
      />

      <GoalContributeModal
        goal={contributeGoal}
        open={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        onContributed={loadData}
      />

      <GoalRebalanceModal
        open={showRebalance}
        onClose={() => setShowRebalance(false)}
        onApplied={loadData}
      />
    </div>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="flex items-center justify-between px-1 py-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Savings Goals</h1>
        <p className="text-xs text-muted mt-0.5">Automated wealth building with income protection</p>
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
