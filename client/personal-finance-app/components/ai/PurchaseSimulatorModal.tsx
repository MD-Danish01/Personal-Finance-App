"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import type { PurchaseSimulationResult } from "@/lib/ai/context";

interface PurchaseSimulatorModalProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = [2500, 5000, 10000, 15000, 25000];

export function PurchaseSimulatorModal({ open, onClose }: PurchaseSimulatorModalProps) {
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Shopping");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    simulation: PurchaseSimulationResult;
    explanation: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          itemName: itemName.trim() || "Prospective Purchase",
          category,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Simulation failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run simulation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Ambient background glow */}
      <div className="absolute -z-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-50 pointer-events-none" />

      <div
        className="
          relative w-full max-w-lg overflow-hidden
          rounded-3xl border border-card-border
          bg-card/95 backdrop-blur-2xl text-foreground
          p-5 sm:p-6 shadow-2xl shadow-black/30 space-y-5
          max-h-[90vh] overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Purchase Simulator"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-primary-soft-border shadow-inner">
              <Icon name="calculator" size={19} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                &ldquo;Can I Afford This?&rdquo; Simulator
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-muted">
                Simulate purchase impact on your daily Safe-to-Spend & goals
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-muted-bg hover:text-foreground transition-all cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Item / Expense Name
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Wireless Headphones"
                className="w-full rounded-xl border border-card-border bg-muted-bg/80 px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="8500"
                  className="w-full rounded-xl border border-card-border bg-muted-bg/80 pl-7 pr-3.5 py-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-muted-bg/80 px-3.5 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium cursor-pointer"
            >
              <option value="Shopping">Shopping & Electronics</option>
              <option value="Food">Dining & Food Delivery</option>
              <option value="Entertainment">Entertainment & Travel</option>
              <option value="Transport">Vehicle & Transport</option>
              <option value="Bills">Bills & Subscriptions</option>
              <option value="Others">General Miscellaneous</option>
            </select>
          </div>

          {/* Quick amount chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-muted shrink-0 font-bold">Quick:</span>
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className="px-2.5 py-1 rounded-lg bg-muted-bg border border-card-border text-[11px] font-semibold text-muted hover:text-primary hover:border-primary transition-all shrink-0 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              >
                ₹{val.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs shadow-primary/20 cursor-pointer active:scale-98"
          >
            <Icon name="sparkles" size={15} />
            <span>{loading ? "Calculating impact..." : "Simulate Impact"}</span>
          </button>
        </form>

        {/* Simulation Output Card */}
        {result && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-2xl border backdrop-blur-sm ${
                result.simulation.status === "SAFE"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                  : result.simulation.status === "TIGHT"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Feasibility Assessment
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-card shadow-2xs border border-current/20">
                  {result.simulation.statusLabel}
                </span>
              </div>

              {/* Before vs After Metric Comparison */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-current/15">
                <div>
                  <span className="text-[11px] opacity-80 block font-medium">Current Daily Safe-to-Spend</span>
                  <span className="text-base sm:text-lg font-extrabold font-mono">
                    {formatINR(result.simulation.originalDailySafeToSpend)}
                    <span className="text-[10px] opacity-75 font-sans font-normal">/day</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] opacity-80 block font-medium">New Safe-to-Spend</span>
                  <span className="text-base sm:text-lg font-extrabold font-mono">
                    {formatINR(result.simulation.newDailySafeToSpend)}
                    <span className="text-[10px] opacity-75 font-sans font-normal">/day</span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI Reasoning Block */}
            <div className="p-4 rounded-2xl bg-muted-bg/80 border border-card-border space-y-2 backdrop-blur-sm shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Icon name="sparkles" size={14} />
                <span>Financial Analysis</span>
              </div>
              <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line font-medium">
                {result.explanation}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
