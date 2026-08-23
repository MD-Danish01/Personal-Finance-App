export function sumAmounts(values: readonly number[]) {
  return Number(values.reduce((total, value) => total + BigInt(value), BigInt(0)));
}

export function difference(left: number, right: number) {
  return Number(BigInt(left) - BigInt(right));
}

export function remainingAmount(target: number, current: number) {
  return Number(
    BigInt(target) > BigInt(current)
      ? BigInt(target) - BigInt(current)
      : BigInt(0),
  );
}

export function percentage(numerator: number, denominator: number) {
  return denominator > 0
    ? Number((BigInt(numerator) * BigInt(100)) / BigInt(denominator))
    : 0;
}

export function boundedPercentage(numerator: number, denominator: number) {
  return Math.min(Math.max(percentage(numerator, denominator), 0), 100);
}

export function positiveVariance(actual: number, planned: number) {
  return Number(
    BigInt(actual) > BigInt(planned)
      ? BigInt(actual) - BigInt(planned)
      : BigInt(0),
  );
}

export function negativeVariance(actual: number, planned: number) {
  return Number(
    BigInt(planned) > BigInt(actual)
      ? BigInt(planned) - BigInt(actual)
      : BigInt(0),
  );
}
