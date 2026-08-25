"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";
import type { PlanAllocation } from "@/lib/types";

interface EditPlanModalProps {
  open: boolean;
  allocations: PlanAllocation[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditPlanModal({ open, allocations, onClose, onSaved }: EditPlanModalProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(allocations.map((item) => [item.key, item.percent])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const total = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);

  async function save() {
    if (total !== 100) {
      setError("Percentages must total 100%");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.put("/plans/update", {
        allocations: Object.entries(values).map(([key, percent]) => ({ key, percent })),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { error?: string } } }).response;
      setError(response?.data?.error ?? "Unable to update plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-card-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Adjust Allocation Split</h2>
            <p className="text-xs text-muted">Customize how your monthly income is allocated</p>
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

        <div className="space-y-3.5 py-1">
          {allocations.map((allocation) => (
            <label key={allocation.key} className="block">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{allocation.label}</span>
                <span className="font-mono text-primary">{values[allocation.key] ?? 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={values[allocation.key] ?? 0}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [allocation.key]: Number(event.target.value),
                  }))
                }
                className="w-full accent-primary h-2 bg-muted-bg rounded-lg cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div
          className={`rounded-xl px-3.5 py-2.5 text-xs font-bold ${
            total === 100
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
          }`}
        >
          Total: {total}% {total === 100 ? "✓ (Balanced)" : "⚠️ (Must equal 100%)"}
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
            type="button"
            onClick={save}
            disabled={saving || total !== 100}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
          >
            {saving ? "Saving..." : "Save Split"}
          </button>
        </div>
      </div>
    </div>
  );
}
