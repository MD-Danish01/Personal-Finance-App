import { Icon } from "../ui/Icon";
import { formatINR } from "@/lib/format";

interface SafeToSpendCardProps {
  amount: number;
  todayDesignated?: number;
  todaySpent?: number;
  isOverDailyBudget?: boolean;
  overspentAmount?: number;
  subtitle: string;
}

export function SafeToSpendCard({
  amount,
  todayDesignated,
  todaySpent = 0,
  isOverDailyBudget = false,
  overspentAmount = 0,
  subtitle,
}: SafeToSpendCardProps) {
  const hasDailyQuota = typeof todayDesignated === "number" && todayDesignated > 0;
  const spentPercent = hasDailyQuota
    ? Math.min(100, Math.round((todaySpent / todayDesignated) * 100))
    : 0;
  const isCaution = !isOverDailyBudget && spentPercent >= 80;

  return (
    <div
      className={`safe-spend-card group relative overflow-hidden rounded-3xl p-5 sm:p-6 text-primary-foreground shadow-lg transition-all duration-300 ${
        isOverDailyBudget
          ? "is-over-budget bg-gradient-to-br from-red-600 via-rose-700 to-amber-700 shadow-red-900/30"
          : "bg-primary"
      }`}
    >
      {/* Ambient animated glow */}
      <div className="safe-spend-glow safe-spend-glow-one pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
      <div className="safe-spend-glow safe-spend-glow-two pointer-events-none absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-black/10 blur-3xl" />

      {/* Subtle moving highlight */}
      <div className="safe-spend-shine pointer-events-none absolute inset-0" />

      <div className="relative z-10 space-y-4">
        {/* Header row with status badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-90">
            Safe to spend today
          </span>

          {isOverDailyBudget ? (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white border border-white/30 backdrop-blur-sm animate-pulse">
              <Icon name="alert-triangle" size={12} />
              <span>Limit Exceeded</span>
            </span>
          ) : todaySpent > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/15">
              <span>{formatINR(todaySpent)} spent today</span>
            </span>
          ) : (
            <span className="safe-spend-icon flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Icon
                name="trending-up"
                size={14}
                className="text-primary-foreground"
              />
            </span>
          )}
        </div>

        {/* Hero Amount */}
        <div>
          <div className="safe-spend-amount flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white">
              {formatINR(isOverDailyBudget ? 0 : amount)}
            </span>

            <span className="text-xs sm:text-sm font-semibold opacity-90">
              {isOverDailyBudget ? "left today (Over budget)" : "left today"}
            </span>
          </div>

          {/* Subtitle */}
          <p className="safe-spend-subtitle mt-1.5 text-xs font-medium leading-relaxed opacity-90">
            {subtitle}
          </p>
        </div>

        {/* Today's Spending Pace Progress Bar */}
        {hasDailyQuota && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-bold opacity-85">
              <span>Today&apos;s Spending Pace</span>
              <span>
                {isOverDailyBudget
                  ? `Exceeded by +${formatINR(overspentAmount)}`
                  : `${spentPercent}% of today's limit`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/25 backdrop-blur-xs">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverDailyBudget
                    ? "bg-amber-300"
                    : spentPercent > 80
                    ? "bg-amber-300"
                    : "bg-white"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, spentPercent))}%` }}
              />
            </div>
          </div>
        )}

        {/* 2 Small Readable Cards: Today's Quota & Status (Safe or Warning) */}
        {hasDailyQuota && (
          <div className="pt-3.5 mt-2 border-t border-white/20 grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* Card 1: Today's Quota */}
            <div className="rounded-2xl bg-black/20 p-3 sm:p-4 border border-white/15 backdrop-blur-sm shadow-inner flex flex-col justify-center">
              <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/75 mb-1 truncate">
                Today&apos;s Quota
              </span>
              <span className="text-sm sm:text-base md:text-lg font-extrabold font-mono text-white tracking-tight truncate">
                {formatINR(todayDesignated)}
              </span>
            </div>

            {/* Card 2: Warning or Safe Status Card */}
            {isOverDailyBudget ? (
              <div className="rounded-2xl bg-rose-500/35 p-3 sm:p-4 border border-rose-400/40 backdrop-blur-sm shadow-inner flex flex-col justify-center animate-pulse">
                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-200 mb-1 truncate">
                  Daily Status
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                  <Icon name="alert-triangle" size={15} className="text-white shrink-0" />
                  <span className="truncate">Over by +{formatINR(overspentAmount)}</span>
                </div>
              </div>
            ) : isCaution ? (
              <div className="rounded-2xl bg-amber-500/30 p-3 sm:p-4 border border-amber-400/40 backdrop-blur-sm shadow-inner flex flex-col justify-center">
                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200 mb-1 truncate">
                  Daily Status
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                  <Icon name="alert-triangle" size={15} className="text-amber-200 shrink-0" />
                  <span className="truncate">Near Cap ({spentPercent}%)</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-500/25 p-3 sm:p-4 border border-emerald-400/35 backdrop-blur-sm shadow-inner flex flex-col justify-center">
                <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200 mb-1 truncate">
                  Daily Status
                </span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                  <Icon name="check-circle" size={15} className="text-emerald-300 shrink-0" />
                  <span className="truncate">Safe &amp; On Track</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}