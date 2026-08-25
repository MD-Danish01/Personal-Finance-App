"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

const GOAL_ICONS = ["💻", "🌴", "🛡️", "🚗", "🏠", "💍", "🎓", "✈️", "🎯"];

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

  if (!open) return null;

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
      await apiClient.post("/goals", {
        name: name.trim(),
        icon,
        targetAmount: Math.round(numTarget * 100),
        deadline: deadline || null,
        monthlyTarget: monthlyTarget ? Math.round(parseFloat(monthlyTarget) * 100) : 0,
      });

      setName("");
      setTargetAmount("");
      setDeadline("");
      setMonthlyTarget("");
      onCreated();
      onClose();
    } catch {
      setError("Failed to create goal. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Create Savings Goal</h2>
            <p className="text-xs text-muted">Set a milestone to plan monthly contributions</p>
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
                Target (₹)
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
                Monthly (₹)
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
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs font-semibold text-muted hover:bg-card-border/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
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
