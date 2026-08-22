import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card border border-border/60 ${className}`}
    >
      {children}
    </div>
  );
}
