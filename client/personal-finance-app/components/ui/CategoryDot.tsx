interface CategoryDotProps {
  colorClass: string;
  size?: number;
}

export function CategoryDot({ colorClass, size = 10 }: CategoryDotProps) {
  return (
    <span
      className={`inline-block rounded-full ${colorClass}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
