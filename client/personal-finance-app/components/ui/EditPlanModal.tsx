"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Edit plan</h2>
            <p className="mt-1 text-xs text-muted">Adjust how your income is allocated.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted">✕</button>
        </div>

        <div className="space-y-4">
          {allocations.map((allocation) => (
            <label key={allocation.key} className="block">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{allocation.label}</span>
                <span className="font-semibold">{values[allocation.key] ?? 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={values[allocation.key] ?? 0}
                onChange={(event) => setValues((current) => ({ ...current, [allocation.key]: Number(event.target.value) }))}
                className="w-full accent-brand-blue"
              />
            </label>
          ))}
        </div>

        <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${total === 100 ? "bg-brand-green-soft text-brand-green" : "bg-red-50 text-red-600"}`}>
          Total: {total}% {total === 100 ? "✓" : "(must equal 100%)"}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border bg-white py-2.5 text-sm font-medium text-muted">Cancel</button>
          <button type="button" onClick={save} disabled={saving || total !== 100} className="flex-1 rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
