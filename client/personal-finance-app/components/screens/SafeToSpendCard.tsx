import { Icon } from "../ui/Icon";
import { formatINR } from "@/lib/format";

interface SafeToSpendCardProps {
  amount: number;
  subtitle: string;
}

export function SafeToSpendCard({ amount, subtitle }: SafeToSpendCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-green p-5 text-white shadow-card">
      <div className="text-sm font-medium opacity-95">Safe to spend today</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-[40px] font-bold leading-none tracking-tight">
          {formatINR(amount)}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25">
          <Icon name="arrow-right" size={18} className="text-white" />
        </div>
      </div>
      <div className="mt-2 text-sm opacity-90">{subtitle}</div>
    </div>
  );
}
