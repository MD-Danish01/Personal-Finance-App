"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import type { Goal } from "@/lib/types";

interface GoalContributeModalProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  onContributed: () => void;
}

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export function GoalContributeModal({
  goal,
  open,
  onClose,
  onContributed,
}: GoalContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !goal) return null;

  const remaining = Math.max(0, (goal.targetAmount - goal.currentAmount) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/goals/${goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record contribution");
      }

      setAmount("");
      setNote("");
      onContributed();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record deposit");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border shadow-2xl p-5 sm:p-6 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold">
              <Icon name="target" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Add to Goal</h2>
              <p className="text-xs text-muted truncate max-w-[220px]">{goal.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Current status pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted-bg border border-card-border text-xs">
          <div>
            <span className="text-muted text-[11px] block">Current Progress</span>
            <span className="font-bold text-foreground">
              {formatINR(goal.currentAmount / 100)} / {formatINR(goal.targetAmount / 100)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted text-[11px] block">Remaining</span>
            <span className="font-bold text-primary font-mono">{formatINR(remaining)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Deposit Amount (₹)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl font-bold text-muted">₹</span>
              <input
                type="number"
                step="1"
                min="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-2xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/40 font-mono"
              />
            </div>
            {/* Quick amount chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 rounded-lg bg-card border border-card-border text-[11px] font-semibold text-muted hover:text-primary hover:border-primary transition-all shrink-0 cursor-pointer"
                >
                  +₹{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Deposit Note / Reason (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly allocation, Birthday bonus"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted-bg border border-card-border text-xs text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted/60"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-card border border-card-border text-xs font-semibold text-muted hover:bg-muted-bg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {loading ? "Depositing..." : "Deposit to Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
