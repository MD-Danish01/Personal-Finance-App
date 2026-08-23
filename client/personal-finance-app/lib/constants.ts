import type { AllocationKey } from "./types";

export const ALLOCATION_LABELS: Record<AllocationKey, string> = {
  essentials: "Essentials",
  enjoyment: "Enjoyment",
  emergency: "Emergency fund",
  future_savings: "Future savings (Goals)",
  long_term_wealth: "Long term wealth",
  buffer: "Buffer",
};

export const ALLOCATION_COLORS: Record<AllocationKey, string> = {
  essentials: "bg-brand-green",
  enjoyment: "bg-brand-orange",
  emergency: "bg-brand-red",
  future_savings: "bg-brand-purple",
  long_term_wealth: "bg-brand-blue",
  buffer: "bg-brand-yellow",
};

export const ALLOCATION_BG: Record<AllocationKey, string> = {
  essentials: "bg-brand-green-soft",
  enjoyment: "bg-brand-orange-soft",
  emergency: "bg-brand-red-soft",
  future_savings: "bg-brand-purple-soft",
  long_term_wealth: "bg-brand-blue-soft",
  buffer: "bg-brand-yellow-soft",
};

export const ALLOCATION_ICONS: Record<AllocationKey, string> = {
  essentials: "shopping-bag",
  enjoyment: "sparkles",
  emergency: "shield",
  future_savings: "target",
  long_term_wealth: "trending-up",
  buffer: "wallet",
};

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function computeRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${day} ${month}`;
}
