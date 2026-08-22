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
  trackClass = "bg-black/5",
  className = "",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${trackClass} ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
