"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";
import type { MonthlyHealthCardData } from "@/app/api/reports/health-card/route";

interface MonthlyHealthCardModalProps {
  open: boolean;
  onClose: () => void;
}

export function MonthlyHealthCardModal({ open, onClose }: MonthlyHealthCardModalProps) {
  const [data, setData] = useState<MonthlyHealthCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetch("/api/reports/health-card")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load health report card");
        return res.json();
      })
      .then((json) => {
        setData(json.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error fetching health card");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Styles for clean A4 1-page printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #financial-health-card-print,
          #financial-health-card-print * {
            visibility: visible !important;
          }
          #financial-health-card-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="w-full max-w-3xl bg-card rounded-3xl border border-card-border shadow-2xl p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar (Hidden during Print) */}
        <div className="flex items-center justify-between border-b border-card-border pb-4 no-print">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-xs">
              <Icon name="file-text" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly Financial Health Card</h2>
              <p className="text-xs text-muted">A4 1-Page Official Scorecard & AI Review</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Icon name="printer" size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted-bg text-muted transition-colors cursor-pointer"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary animate-spin">
              <Icon name="refresh-cw" size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Generating your comprehensive financial health card...
            </p>
            <p className="text-xs text-muted">Calculating 300-900 score, safe-to-spend compliance, and AI audit</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <p className="text-sm font-semibold text-red-500">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-card border border-card-border text-xs font-bold text-foreground"
            >
              Close
            </button>
          </div>
        )}

        {/* The Printable 1-Page Financial Health Card */}
        {data && !loading && (
          <div
            id="financial-health-card-print"
            className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 space-y-5 text-foreground"
          >
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-card-border pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-primary-soft text-primary">
                    CONFIDENTIAL FISCAL AUDIT
                  </span>
                  <span className="text-xs text-muted font-medium">{data.period.monthName}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1">
                  Financial Health Certificate
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  Prepared for <span className="font-bold text-foreground">{data.user.name}</span> ({data.user.email})
                </p>
              </div>

              {/* Verified Badge */}
              <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl border border-card-border bg-muted-bg">
                <Icon name="shield" size={16} className="text-emerald-500" />
                <div className="text-[10px] leading-tight">
                  <span className="block font-bold text-foreground">AI Copilot Verified</span>
                  <span className="text-muted">Exact Paise Deterministic Math</span>
                </div>
              </div>
            </div>

            {/* Score & Tier Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted-bg/60 border border-card-border">
              {/* Main Score Display */}
              <div className="flex items-center gap-4 md:border-r md:border-card-border md:pr-4">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-md">
                  {data.score.grade}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-foreground font-mono">
                      {data.score.total}
                    </span>
                    <span className="text-xs font-semibold text-muted">/ 900</span>
                  </div>
                  <p className="text-xs font-bold text-primary mt-0.5">{data.score.tier}</p>
                  <p className="text-[10px] text-muted">Comprehensive Financial Health Index</p>
                </div>
              </div>

              {/* Score Breakdown Pills */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-card border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Savings</span>
                  <span className="text-sm font-bold text-emerald-500 font-mono">
                    +{data.score.breakdown.savingsRateScore}
                  </span>
                  <span className="text-[9px] text-muted block">/ 200 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Safe Spend</span>
                  <span className="text-sm font-bold text-blue-500 font-mono">
                    +{data.score.breakdown.safeSpendScore}
                  </span>
                  <span className="text-[9px] text-muted block">/ 200 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Goals</span>
                  <span className="text-sm font-bold text-purple-500 font-mono">
                    +{data.score.breakdown.goalDisciplineScore}
                  </span>
                  <span className="text-[9px] text-muted block">/ 100 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-card-border">
                  <span className="text-[10px] font-semibold text-muted uppercase block">Runway</span>
                  <span className="text-sm font-bold text-amber-500 font-mono">
                    +{data.score.breakdown.runwayScore}
                  </span>
                  <span className="text-[9px] text-muted block">/ 100 pts</span>
                </div>
              </div>
            </div>

            {/* Monthly Financial Metrics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-card border border-card-border">
                <span className="text-[11px] font-semibold text-muted uppercase block">Monthly Inflow</span>
                <span className="text-base font-bold text-emerald-500 font-mono mt-1 block">
                  {formatINR(data.cashflow.monthlyIncome)}
                </span>
                <span className="text-[10px] text-muted">Income / Credits</span>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-card-border">
                <span className="text-[11px] font-semibold text-muted uppercase block">Total Outflow</span>
                <span className="text-base font-bold text-red-500 font-mono mt-1 block">
                  {formatINR(data.cashflow.totalExpenses)}
                </span>
                <span className="text-[10px] text-muted">Expenses this month</span>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-card-border">
                <span className="text-[11px] font-semibold text-muted uppercase block">Net Savings</span>
                <span className="text-base font-bold text-foreground font-mono mt-1 block">
                  {formatINR(data.cashflow.netSavings)}
                </span>
                <span className="text-[10px] font-bold text-emerald-500">
                  {data.cashflow.savingsRatePercent}% savings rate
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-card-border">
                <span className="text-[11px] font-semibold text-muted uppercase block">Daily Safe Limit</span>
                <span className="text-base font-bold text-primary font-mono mt-1 block">
                  {formatINR(data.cashflow.dailySafeToSpend)}
                </span>
                <span className="text-[10px] text-muted">Goal-protected quota/day</span>
              </div>
            </div>

            {/* Goals & Safe-to-Spend Discipline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Safe-to-Spend Compliance */}
              <div className="p-4 rounded-xl bg-card border border-card-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Icon name="check-circle" size={15} className="text-primary" />
                    Daily Safe-to-Spend Compliance
                  </span>
                  <span className="text-xs font-black font-mono text-primary">
                    {data.compliance.compliancePercent}%
                  </span>
                </div>
                <div className="w-full bg-muted-bg rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${data.compliance.compliancePercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted">
                  Spent within the safe daily quota on <span className="font-bold text-foreground">{data.compliance.daysWithinBudget}</span> out of {data.compliance.daysEvaluated} elapsed days.
                </p>
              </div>

              {/* Goals Auto-Allocation */}
              <div className="p-4 rounded-xl bg-card border border-card-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Icon name="target" size={15} className="text-purple-500" />
                    Goals Capacity & Auto-Allocation
                  </span>
                  <span className="text-xs font-black font-mono text-purple-500">
                    {data.goalsSummary.capacityUsedPercent}% / 35% Max
                  </span>
                </div>
                <div className="w-full bg-muted-bg rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.goalsSummary.capacityUsedPercent > 35 ? "bg-red-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${Math.min(100, (data.goalsSummary.capacityUsedPercent / 35) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted">
                  <span className="font-bold text-foreground">{data.goalsSummary.activeGoalsCount} active goals</span> receiving {formatINR(data.goalsSummary.monthlyAllocationRupees)}/month auto-allocation.
                </p>
              </div>
            </div>

            {/* Spending Category Breakdown */}
            {data.categories.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Category Distribution
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.categories.map((cat) => (
                    <div
                      key={cat.category}
                      className="p-2.5 rounded-xl bg-muted-bg/50 border border-card-border flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-foreground">{cat.category}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-foreground">
                          {formatINR(cat.amount)}
                        </span>
                        <span className="text-[10px] text-muted block">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Copilot Executive Summary */}
            <div className="p-4 rounded-2xl bg-primary-soft/30 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Icon name="sparkles" size={15} />
                <span>IBM watsonx AI Financial Summary & Directives</span>
              </div>
              <ul className="space-y-1.5 text-xs text-foreground/90">
                {data.aiRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer / Watermark */}
            <div className="pt-2 border-t border-card-border flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted">
              <span>Report Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
              <span className="font-semibold">Personal Finance AI Copilot • 100% Client-Safe</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
