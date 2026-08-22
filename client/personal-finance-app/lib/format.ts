export function formatINR(value: number): string {
  const rounded = Math.round(value);
  return `₹${rounded.toLocaleString("en-IN")}`;
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatAmountShort(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return value.toString();
}
