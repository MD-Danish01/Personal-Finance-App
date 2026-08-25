"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatINR, formatPercent } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface CategoryLimitItem {
  category: string;
  monthlyLimit: number; // paise
  spentPaise: number;
  percent: number;
  status: "not_set" | "ok" | "warning" | "exceeded";
}

const CATEGORY_META: Record<string, { icon: IconName; colorClass: string }> = {
  Food: { icon: "utensils", colorClass: "text-amber-500 bg-amber-500/10" },
  Transport: { icon: "car", colorClass: "text-blue-500 bg-blue-500/10" },
  Shopping: { icon: "shopping-bag", colorClass: "text-purple-500 bg-purple-500/10" },
  Entertainment: { icon: "film", colorClass: "text-rose-500 bg-rose-500/10" },
  Bills: { icon: "receipt", colorClass: "text-emerald-500 bg-emerald-500/10" },
  Others: { icon: "wallet", colorClass: "text-slate-500 bg-slate-500/10" },
};

export function CategoryLimitsCard() {
  const [limits, setLimits] = useState<CategoryLimitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newLimitAmount, setNewLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadLimits() {
      try {
        const res = await fetch("/api/limits");
        if (res.ok && !ignore) {
          const data = await res.json();
          setLimits(data.limits || []);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadLimits();

    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const val = parseFloat(newLimitAmount);
    if (isNaN(val) || val < 0) return;

    try {
      setSaving(true);
      const res = await fetch("/api/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editingCategory,
          monthlyLimit: val,
        }),
      });

      if (res.ok) {
        setEditingCategory(null);
        setNewLimitAmount("");
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      alert("Failed to save limit");
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (item: CategoryLimitItem) => {
    setEditingCategory(item.category);
    setNewLimitAmount(item.monthlyLimit > 0 ? String(item.monthlyLimit / 100) : "");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Category Spending Limits
          </h3>
          <p className="text-[11px] text-muted">Set monthly caps to avoid overspending</p>
        </div>
      </div>

      <Card className="divide-y divide-card-border overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-xs text-muted">
            <Icon name="refresh-cw" size={16} className="animate-spin text-primary mx-auto mb-2" />
            Loading spending limits...
          </div>
        ) : (
          limits.map((item) => {
            const meta = CATEGORY_META[item.category] || {
              icon: "wallet",
              colorClass: "text-primary bg-primary-soft",
            };
            const hasLimit = item.monthlyLimit > 0;
            const remainingPaise = item.monthlyLimit - item.spentPaise;

            let progressColor = "bg-primary";
            if (item.status === "exceeded") progressColor = "bg-red-500";
            else if (item.status === "warning") progressColor = "bg-amber-500";

            return (
              <div key={item.category} className="p-3.5 hover:bg-muted-bg/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.colorClass}`}
                    >
                      <Icon name={meta.icon} size={15} />
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-muted">
                        Spent: <span className="font-semibold text-foreground">{formatINR(item.spentPaise / 100)}</span>
                        {hasLimit && (
                          <span> / {formatINR(item.monthlyLimit / 100)}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasLimit ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.status === "exceeded"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            : item.status === "warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.status === "exceeded"
                          ? `Over by ${formatINR(Math.abs(remainingPaise) / 100)}`
                          : `${formatPercent(item.percent)} spent`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted bg-muted-bg px-2 py-0.5 rounded-md">
                        No Limit
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditor(item)}
                      className="p-1 text-muted hover:text-primary transition-colors cursor-pointer"
                      title="Edit limit"
                    >
                      <Icon name="swap" size={14} />
                    </button>
                  </div>
                </div>

                {hasLimit && (
                  <div className="mt-2">
                    <ProgressBar
                      value={item.spentPaise}
                      max={item.monthlyLimit}
                      colorClass={progressColor}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      {/* Edit Limit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-card rounded-2xl border border-card-border p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Set Limit: {editingCategory}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-muted hover:text-foreground cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLimit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Monthly Budget Cap (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  autoFocus
                  required
                  value={newLimitAmount}
                  onChange={(e) => setNewLimitAmount(e.target.value)}
                  placeholder="e.g. 5000 (0 to remove)"
                  className="w-full px-3 py-2.5 text-base font-bold rounded-xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2 rounded-xl bg-muted-bg text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Set Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
