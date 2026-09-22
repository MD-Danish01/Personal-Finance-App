"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatINR } from "@/lib/format";

interface OverspendWarningModalProps {
  open: boolean;
  onClose: () => void;
  todaySpent: number;
  todayDesignated: number;
  overspentAmount: number;
  newDailySafeToSpend?: number;
  onOpenAdvisor?: () => void;
}

export function OverspendWarningModal({
  open,
  onClose,
  todaySpent,
  todayDesignated,
  overspentAmount,
  newDailySafeToSpend,
  onOpenAdvisor,
}: OverspendWarningModalProps) {
  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-end sm:items-center justify-center
        p-3 sm:p-5
        bg-black/65 backdrop-blur-md
        animate-in fade-in duration-200
      "
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="overspend-dialog-title"
    >
      {/* Ambient background glow */}
      <div className="absolute -z-10 h-72 w-72 rounded-full bg-red-500/20 blur-3xl opacity-60 pointer-events-none" />

      {/* Modal Container */}
      <div
        className="
          relative w-full max-w-lg
          rounded-3xl border border-red-500/30
          bg-card text-foreground
          p-5 sm:p-6
          shadow-2xl shadow-red-950/40
          space-y-4 sm:space-y-5
          max-h-[92vh] overflow-y-auto
          animate-in slide-in-from-bottom-6 duration-300
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 shadow-inner">
              <Icon name="alert-triangle" size={22} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-[10px] font-extrabold uppercase tracking-wider text-red-400 border border-red-500/20 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Overspending Alert
              </div>
              <h2
                id="overspend-dialog-title"
                className="text-base sm:text-lg font-extrabold tracking-tight text-foreground"
              >
                Daily Safe-to-Spend Exceeded
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss alert"
            className="
              flex h-8 w-8 items-center justify-center
              rounded-xl text-muted
              hover:bg-muted-bg hover:text-foreground
              transition-colors cursor-pointer
            "
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Core Stat Numbers */}
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4 space-y-3">
          <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed">
            You have spent{" "}
            <strong className="font-bold text-red-400">
              {formatINR(todaySpent)}
            </strong>{" "}
            today, which is{" "}
            <strong className="font-bold text-red-500">
              +{formatINR(overspentAmount)}
            </strong>{" "}
            over your designated daily allowance of{" "}
            <strong className="font-bold text-foreground">
              {formatINR(todayDesignated)}
            </strong>
            .
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-red-500/15">
            <div className="p-2.5 rounded-xl bg-card/60 border border-card-border">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Today&apos;s Limit
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono text-foreground">
                {formatINR(todayDesignated)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-card/60 border border-card-border">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Spent Today
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono text-red-400">
                {formatINR(todaySpent)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-card/60 border border-card-border">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                New Daily Limit
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono text-amber-400">
                {newDailySafeToSpend ? `${formatINR(newDailySafeToSpend)}/day` : "Adjusted"}
              </span>
            </div>
          </div>
        </div>

        {/* Impact & Consequences */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Financial Consequences
          </h3>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted-bg border border-card-border text-xs">
              <span className="text-base leading-none">📉</span>
              <div>
                <strong className="font-bold text-foreground">
                  Reduced Future Allowance:
                </strong>{" "}
                <span className="text-muted">
                  To rebalance your monthly budget, your daily safe-to-spend for upcoming days must be trimmed.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted-bg border border-card-border text-xs">
              <span className="text-base leading-none">🎯</span>
              <div>
                <strong className="font-bold text-foreground">
                  Goal Milestone Delay:
                </strong>{" "}
                <span className="text-muted">
                  Unchecked daily overruns eat into your allocated savings and push back your active target dates.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted-bg border border-card-border text-xs">
              <span className="text-base leading-none">🛡️</span>
              <div>
                <strong className="font-bold text-foreground">
                  Emergency Runway Risk:
                </strong>{" "}
                <span className="text-muted">
                  Consecutive deficit days force you to dip into your safety buffer rather than growing your net worth.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="
              w-full py-3 rounded-xl
              bg-primary text-primary-foreground
              text-xs font-extrabold
              hover:opacity-90
              transition-opacity
              cursor-pointer shadow-sm
              active:scale-98
            "
          >
            I Understand, I&apos;ll Adjust Today
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/money"
              onClick={onClose}
              className="
                py-2.5 rounded-xl
                border border-card-border bg-muted-bg
                text-xs font-bold text-foreground
                text-center hover:border-primary/40
                transition-colors cursor-pointer
                flex items-center justify-center gap-1.5
              "
            >
              <Icon name="receipt" size={14} />
              <span>Review Expenses</span>
            </Link>

            {onOpenAdvisor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdvisor();
                }}
                className="
                  py-2.5 rounded-xl
                  border border-primary/30 bg-primary/10
                  text-xs font-bold text-primary
                  text-center hover:bg-primary/20
                  transition-colors cursor-pointer
                  flex items-center justify-center gap-1.5
                "
              >
                <Icon name="sparkles" size={14} />
                <span>Ask AI Copilot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
