"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";
import type { Goal } from "@/lib/types";

const GOAL_ICONS = ["💻", "🌴", "🛡️", "🚗", "🏠", "💍", "🎓", "✈️", "🎯", "📱", "💼", "🏋️"];

interface GoalEditModalProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function GoalEditModal({ goal, open, onClose, onUpdated }: GoalEditModalProps) {
  if (!open || !goal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <GoalEditContent
        key={goal.id}
        goal={goal}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </div>
  );
}

function GoalEditContent({
  goal,
  onClose,
  onUpdated,
}: {
  goal: Goal;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(Math.round(goal.targetAmount / 100)));
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [monthlyTarget, setMonthlyTarget] = useState(
    goal.monthlyTarget ? String(Math.round(goal.monthlyTarget / 100)) : "",
  );
  const [icon, setIcon] = useState(goal.icon || GOAL_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setSaving(true);
    setError(null);

    try {
      await apiClient.put(`/goals/${goal.id}`, {
        name: name.trim(),
        icon,
        targetAmount: Math.round(numTarget * 100),
        deadline: deadline || null,
        monthlyTarget: monthlyTarget ? Math.round(parseFloat(monthlyTarget) * 100) : 0,
      });

      onUpdated();
      onClose();
    } catch {
      setError("Failed to update goal. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/goals/${goal.id}`);
      onUpdated();
      onClose();
    } catch {
      setError("Failed to delete goal. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-xl">
            {icon}
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Edit Savings Goal</h2>
            <p className="text-xs text-muted">Update milestone details or delete goal</p>
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
            placeholder="e.g. Goa Trip, New Laptop"
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
              Target Amount (₹)
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
              className="w-full rounded-xl border border-card-border bg-muted-bg px-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
          </div>
        </div>

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
            type="submit"
            disabled={saving || deleting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Delete Goal Section */}
      <div className="pt-3 border-t border-card-border">
        {!showConfirmDelete ? (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Icon name="trash-2" size={14} />
            <span>Delete this Goal</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2.5 animate-in fade-in">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              Are you sure you want to delete &ldquo;{goal.name}&rdquo;?
            </p>
            <p className="text-[11px] text-muted">
              All saved contributions toward this goal will be removed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-1.5 rounded-xl bg-card border border-card-border text-xs font-medium text-foreground hover:bg-muted-bg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
