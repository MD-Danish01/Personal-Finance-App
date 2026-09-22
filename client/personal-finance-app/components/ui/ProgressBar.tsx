interface ProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  trackClass?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  colorClass = "bg-brand-green",
  trackClass = "bg-slate-200/80 dark:bg-white/10",
  className = "",
}: ProgressBarProps) {
  const pct =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={`progress-bar-track h-2 w-full overflow-hidden rounded-full ${trackClass} ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`progress-bar-fill h-full rounded-full transition-all duration-300 ${colorClass}`}
        style={{
          width: `${pct}%`,
          minWidth: pct > 0 ? "6px" : "0px",
        }}
      />
    </div>
  );
}