import type { Category } from "@/lib/types";

interface SpendingDonutProps {
  data: { category: Category; amount: number }[];
  total: number;
}

const COLOR_BY_CATEGORY: Record<Category, string> = {
  Food: "#2bb673",
  Transport: "#3d7df6",
  Shopping: "#8b6ce6",
  Bills: "#f39a2b",
  Entertainment: "#ef6a5e",
  Others: "#c8ccd3",
};

const SIZE = 160;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SpendingDonut({ data, total }: SpendingDonutProps) {
  const safeTotal = total > 0 ? total : 1;
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#ececef"
          strokeWidth={STROKE}
        />
        {data.map((slice, index) => {
          const fraction = slice.amount / safeTotal;
          const dashLength = fraction * CIRCUMFERENCE;
          const cumulative = data
            .slice(0, index)
            .reduce((sum, previous) => sum + previous.amount / safeTotal, 0);
          const dashOffset = -cumulative * CIRCUMFERENCE;
          return (
            <circle
              key={slice.category}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={COLOR_BY_CATEGORY[slice.category]}
              strokeWidth={STROKE}
              strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-foreground">
          ₹{total.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-muted">Total</span>
      </div>
    </div>
  );
}
