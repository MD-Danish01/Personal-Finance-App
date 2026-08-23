"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";

const GOAL_ICONS = ["💻", "🌴", "🛡", "🚗", "🏠", "💍", "🎓", "✈️", "🎯"];

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

    if (!name || !targetAmount) {
      setError("Name and target amount are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiClient.post("/goals", {
        name,
        icon,
        targetAmount: Math.round(parseFloat(targetAmount) * 100),
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Create new goal</h2>
          <button onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Goal name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laptop, Goa Trip"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setIcon(g)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                    icon === g ? "ring-2 ring-brand-blue" : "bg-muted/50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Target amount (₹)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="80000"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
              min="1"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Monthly target (₹)</label>
            <input
              type="number"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              placeholder="5000"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
              min="1"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Deadline</label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Dec 2024"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create goal"}
          </button>
        </form>
      </div>
    </div>
  );
}
