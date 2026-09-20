import { Icon } from "../ui/Icon";
import { formatINR } from "@/lib/format";

interface SafeToSpendCardProps {
  amount: number;
  subtitle: string;
}

export function SafeToSpendCard({
  amount,
  subtitle,
}: SafeToSpendCardProps) {
  return (
    <div className="safe-spend-card group relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg">
      {/* Ambient animated glow */}
      <div className="safe-spend-glow safe-spend-glow-one pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-3xl" />

      <div className="safe-spend-glow safe-spend-glow-two pointer-events-none absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-black/10 blur-3xl" />

      {/* Very subtle moving highlight */}
      <div className="safe-spend-shine pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
            Safe to spend today
          </span>

          <span className="safe-spend-icon flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Icon
              name="trending-up"
              size={14}
              className="text-primary-foreground"
            />
          </span>
        </div>

        {/* Amount */}
        <div className="safe-spend-amount mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight font-mono">
            {formatINR(amount)}
          </span>

          <span className="text-xs opacity-75">/day</span>
        </div>

        {/* Subtitle */}
        <div className="safe-spend-subtitle mt-2.5 text-xs font-medium leading-relaxed opacity-90">
          {subtitle}
        </div>
      </div>
    </div>
  );
}