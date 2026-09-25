"use client";

import { useState, useEffect } from "react";
import { getGoalRebalancePlan, applyGoalRebalance } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Zap, ShieldCheck, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import type { RebalancePlan } from "@/lib/types";

interface GoalRebalanceModalProps {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export function GoalRebalanceModal({
  open,
  onClose,
  onApplied,
}: GoalRebalanceModalProps) {
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustedTargets, setAdjustedTargets] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setLoading(true);
        setError(null);
      });
      getGoalRebalancePlan()
        .then((p) => {
          setPlan(p);
          const initialMap: Record<string, number> = {};
          p.recommendations.forEach((r) => {
            initialMap[r.goalId] = r.suggestedMonthlyTargetRupees;
          });
          setAdjustedTargets(initialMap);
        })
        .catch((err) => {
          console.error("Failed to fetch rebalance plan:", err);
          setError("Failed to generate AI recommendations. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open]);

  if (!open) return null;

  const currentTotal = plan?.currentTotalMonthlyCommitmentRupees ?? 0;
  const newTotal = Object.values(adjustedTargets).reduce((s, v) => s + (v || 0), 0);
  const savingsFreed = Math.max(0, currentTotal - newTotal);
  const dailyGain = Math.round(savingsFreed / 30);

  const handleTargetChange = (goalId: string, val: number) => {
    setAdjustedTargets((prev) => ({
      ...prev,
      [goalId]: Math.max(0, val),
    }));
  };

  const handleApply = async () => {
    if (!plan) return;
    setApplying(true);
    setError(null);

    const allocations = Object.entries(adjustedTargets).map(([goalId, val]) => ({
      goalId,
      monthlyTargetRupees: val,
    }));

    try {
      await applyGoalRebalance(allocations);
      onApplied();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to apply rebalanced targets.";
      setError(msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-card-border p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Zap size={20} className="fill-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <span>AI Goal Rebalancer</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Granite AI
                </span>
              </h2>
              <p className="text-xs text-muted">
                Optimized by salary math to protect daily living
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted font-medium">
              Analyzing monthly income, active goals, and safe living envelopes...
            </p>
          </div>
        ) : plan ? (
          <div className="space-y-4">
            {/* Top Impact Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-card via-card to-emerald-500/10 border border-card-border p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-muted-bg/60">
                  <span className="text-[10px] text-muted block uppercase font-semibold">
                    Current Monthly
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground font-mono">
                    {formatINR(currentTotal)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-semibold">
                    AI Recommended
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatINR(newTotal)}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] text-primary block uppercase font-semibold">
                    Daily Safe Gain
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-primary font-mono flex items-center justify-center gap-0.5">
                    <TrendingUp size={12} />
                    +{formatINR(dailyGain)}/d
                  </span>
                </div>
              </div>

              {/* AI Explanation Callout */}
              <div className="flex items-start gap-2.5 rounded-xl bg-muted-bg/80 border border-card-border/80 p-3 text-xs leading-relaxed text-foreground">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <p>{plan.aiExplanation}</p>
              </div>
            </div>

            {/* Goal-by-goal Recommendation Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span className="text-muted uppercase tracking-wider text-[11px]">
                  Goal Allocations Rebalancing
                </span>
                <span className="text-muted text-[11px]">
                  Click input to tweak
                </span>
              </div>

              {plan.recommendations.map((rec) => {
                const targetVal = adjustedTargets[rec.goalId] ?? rec.suggestedMonthlyTargetRupees;
                const delta = targetVal - rec.currentMonthlyTargetRupees;

                return (
                  <div
                    key={rec.goalId}
                    className="p-3.5 rounded-2xl bg-card border border-card-border space-y-2.5 hover:border-card-border/90 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted-bg text-xl shrink-0">
                          {rec.icon}
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            {rec.goalName}
                          </h4>
                          <span className="text-[11px] text-muted">
                            Remaining: {formatINR(rec.remainingAmountRupees)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-muted line-through font-mono">
                            {formatINR(rec.currentMonthlyTargetRupees)}
                          </span>
                          <ArrowRight size={12} className="text-muted" />
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2 text-xs font-bold text-primary">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={targetVal}
                              onChange={(e) =>
                                handleTargetChange(
                                  rec.goalId,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-24 pl-5 pr-2 py-1 text-xs font-bold font-mono rounded-lg bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            />
                          </div>
                        </div>

                        {delta !== 0 && (
                          <span
                            className={`text-[10px] font-bold block mt-0.5 ${
                              delta < 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-primary"
                            }`}
                          >
                            {delta < 0
                              ? `Frees up ${formatINR(Math.abs(delta))}/mo for daily spend`
                              : `+${formatINR(delta)}/mo faster completion`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rationale pill */}
                    <p className="text-[11px] text-muted leading-tight bg-muted-bg/50 p-2 rounded-xl border border-card-border/40">
                      💡 {rec.reason}
                    </p>
                  </div>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs font-semibold text-muted hover:bg-card-border/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={15} />
                <span>{applying ? "Applying Rebalance..." : "Apply AI Rebalanced Targets"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted">
            No goals available to rebalance.
          </div>
        )}
      </div>
    </div>
  );
}
