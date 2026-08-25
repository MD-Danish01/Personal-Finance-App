import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-card shadow-card border border-card transition-colors duration-150 ${className}`}
    >
      {children}
    </div>
  );
}
