"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatINR, formatPercent } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface EmergencyFundData {
  currentAmount: number;
  targetAmount: number;
  targetMonths: number;
  monthlyEssentials: number;
  runwayMonths: number;
  progressPercent: number;
  shortfall: number;
}

export function EmergencyFundCard() {
  const [data, setData] = useState<EmergencyFundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadFund() {
      try {
        const res = await fetch("/api/emergency-fund");
        if (res.ok && !ignore) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFund();

    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    try {
      setSaving(true);
      const res = await fetch("/api/emergency-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", amount: val }),
      });

      if (res.ok) {
        setIsDepositOpen(false);
        setDepositAmount("");
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      alert("Failed to deposit to emergency fund");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[120px]">
        <div className="flex items-center gap-2.5 text-xs text-muted">
          <Icon name="refresh-cw" size={16} className="animate-spin text-primary" />
          <span>Calculating emergency runway...</span>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const runwayStatus =
    data.runwayMonths >= data.targetMonths
      ? "Fully Protected"
      : data.runwayMonths >= 3
      ? "Moderate Buffer"
      : "High Risk";

  const runwayBadgeClass =
    data.runwayMonths >= data.targetMonths
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : data.runwayMonths >= 3
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Emergency Fund & Safety Runway
          </h3>
          <p className="text-[11px] text-muted">Your liquid cushion for unforeseen life events</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDepositOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
        >
          <Icon name="plus" size={13} />
          <span>Add Buffer</span>
        </button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary font-bold shadow-xs">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">
                  {data.runwayMonths} Months
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${runwayBadgeClass}`}
                >
                  {runwayStatus}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Target: {data.targetMonths} months of essential expenses ({formatINR(data.targetAmount / 100)})
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted">Corpus Saved</span>
            <span className="font-bold text-foreground">
              {formatINR(data.currentAmount / 100)} / {formatINR(data.targetAmount / 100)} (
              {formatPercent(data.progressPercent)})
            </span>
          </div>
          <ProgressBar
            value={data.currentAmount}
            max={data.targetAmount || 1}
            colorClass={
              data.runwayMonths >= data.targetMonths
                ? "bg-emerald-500"
                : data.runwayMonths >= 3
                ? "bg-amber-500"
                : "bg-primary"
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-card-border text-xs">
          <div className="p-2 rounded-xl bg-muted-bg">
            <span className="text-[10px] text-muted block">Monthly Essentials</span>
            <span className="font-bold text-foreground">
              {formatINR(data.monthlyEssentials / 100)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-muted-bg">
            <span className="text-[10px] text-muted block">Corpus Shortfall</span>
            <span className="font-bold text-primary">
              {data.shortfall > 0 ? formatINR(data.shortfall / 100) : "Goal Met 🎉"}
            </span>
          </div>
        </div>
      </Card>

      {/* Deposit Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-card rounded-2xl border border-card-border p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Deposit to Emergency Fund
              </h3>
              <button
                type="button"
                onClick={() => setIsDepositOpen(false)}
                className="text-muted hover:text-foreground cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleDeposit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Deposit Amount (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  autoFocus
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2.5 text-base font-bold rounded-xl bg-muted-bg border border-card-border text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-muted-bg text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Add to Fund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
