import { Icon } from "../ui/Icon";
import { formatINR } from "@/lib/format";

interface SafeToSpendCardProps {
  amount: number;
  subtitle: string;
}

export function SafeToSpendCard({ amount, subtitle }: SafeToSpendCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg transition-all duration-200">
      {/* Subtle ambient light gradient */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
            Safe to spend today
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs">
            <Icon name="trending-up" size={14} className="text-primary-foreground" />
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight font-mono">
            {formatINR(amount)}
          </span>
          <span className="text-xs opacity-75">/day</span>
        </div>

        <div className="mt-2.5 text-xs opacity-90 leading-relaxed font-medium">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
