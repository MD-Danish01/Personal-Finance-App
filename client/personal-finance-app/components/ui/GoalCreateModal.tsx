"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/client";
import { getGoalCapacity } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import type { GoalCapacityInfo } from "@/lib/types";

const GOAL_ICONS = ["💻", "🌴", "🛡️", "🚗", "🏠", "💍", "🎓", "✈️", "🎯", "📱", "💼", "🏋️"];

interface GoalCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function GoalCreateModal({ open, onClose, onCreated }: GoalCreateModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [icon, setIcon] = useState(GOAL_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capacity, setCapacity] = useState<GoalCapacityInfo | null>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => setLoadingCapacity(true));
      getGoalCapacity()
        .then((cap) => {
          setCapacity(cap);
          if (cap.restrictionReason && !cap.canCreateGoal) {
            setError(cap.restrictionReason);
          } else {
            setError(null);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch goal capacity:", err);
        })
        .finally(() => {
          setLoadingCapacity(false);
        });
    } else {
      queueMicrotask(() => {
        setName("");
        setTargetAmount("");
        setDeadline("");
        setMonthlyTarget("");
        setError(null);
      });
    }
  }, [open]);

  if (!open) return null;

  const enteredMonthly = parseFloat(monthlyTarget) || 0;
  const isOverSafeCapacity =
    capacity &&
    capacity.hasIncome &&
    enteredMonthly > capacity.remainingMonthlyCapacityRupees;

  const exceedsTargetAmount =
    parseFloat(targetAmount) > 0 &&
    enteredMonthly > parseFloat(targetAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !targetAmount) {
      setError("Name and target amount are required");
      return;
    }

    const numTarget = parseFloat(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      setError("Enter a valid target amount greater than 0");
      return;
    }

    if (isOverSafeCapacity) {
      setError(
        `Monthly allocation exceeds your safe savings capacity (₹${capacity?.remainingMonthlyCapacityRupees.toLocaleString(
          "en-IN",
        )} available). Reduce the monthly amount to protect your daily living expenses.`,
      );
      return;
    }

    if (exceedsTargetAmount) {
      setError("Monthly target cannot be greater than the goal's total target amount.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post("/goals", {
        name: name.trim(),
        icon,
        targetAmount: Math.round(numTarget * 100),
        deadline: deadline || null,
        monthlyTarget: enteredMonthly > 0 ? Math.round(enteredMonthly * 100) : 0,
      });

      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to create goal. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Create Savings Goal</h2>
            <p className="text-xs text-muted">Smart income-bounded goal with auto-allocation</p>
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

        {/* Real-time Income Capacity Card */}
        {capacity && capacity.hasIncome ? (
          <div className="rounded-2xl bg-muted-bg border border-card-border p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Monthly Goal Capacity
              </span>
              <span className="font-mono text-foreground">
                {formatINR(capacity.existingMonthlyCommitmentRupees)} / {formatINR(capacity.maxAllowedMonthlyRupees)}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-card-border/60">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  capacity.remainingMonthlyCapacityRupees <= 0
                    ? "bg-red-500"
                    : isOverSafeCapacity
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((capacity.existingMonthlyCommitmentRupees + (enteredMonthly || 0)) /
                        (capacity.maxAllowedMonthlyRupees || 1)) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
              <span>
                Available:{" "}
                <strong className={capacity.remainingMonthlyCapacityRupees <= 0 ? "text-red-500" : "text-primary"}>
                  {formatINR(capacity.remainingMonthlyCapacityRupees)}/mo
                </strong>
              </span>
              <span>
                Active Goals:{" "}
                <strong>
                  {capacity.activeGoalsCount}/{capacity.maxGoalsCount}
                </strong>
              </span>
            </div>
          </div>
        ) : !loadingCapacity && capacity && !capacity.hasIncome ? (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ <strong>No Income Profile Found:</strong> Please set your monthly income in Profile first so the system can protect your daily living expenses.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Goal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip, New Laptop, Emergency Corpus"
              className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Choose Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setIcon(g)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all cursor-pointer ${
                    icon === g
                      ? "bg-primary-soft ring-2 ring-primary scale-105"
                      : "bg-muted-bg hover:bg-card-border/40"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Total Target (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
                className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Monthly Target (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="5000"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 font-mono transition-colors ${
                  isOverSafeCapacity
                    ? "border-red-500 bg-red-500/10 focus:ring-red-500"
                    : "border-card-border bg-muted-bg focus:ring-primary"
                }`}
              />
            </div>
          </div>

          {/* Dynamic feedback on monthly target */}
          {enteredMonthly > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <span>⚡ Auto-Allocation Enabled</span>
              </div>
              <p className="text-muted leading-tight">
                <strong>{formatINR(enteredMonthly)}</strong> will be automatically reserved from your monthly income on the 1st of each month and credited towards this goal, keeping your daily Safe-to-Spend strictly protected.
              </p>
            </div>
          )}

          {isOverSafeCapacity && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠️ <strong>Safe Limit Exceeded:</strong> Allocating {formatINR(enteredMonthly)}/mo exceeds your safe savings limit of {formatINR(capacity?.remainingMonthlyCapacityRupees ?? 0)}/mo. This will deplete your daily living essentials (food, bills, transport).
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Target Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs font-semibold text-muted hover:bg-card-border/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (capacity && !capacity.canCreateGoal) || isOverSafeCapacity || exceedsTargetAmount}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
            >
              {saving ? "Creating..." : "Save Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
