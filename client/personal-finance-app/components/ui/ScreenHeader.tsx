import type { ReactNode } from "react";

interface ScreenHeaderProps {
  title?: string;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: ScreenHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-2">
        {left}
        <div>
          {title && (
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {title}
            </h1>
          )}
          {subtitle && (
            <div className="text-sm text-muted">{subtitle}</div>
          )}
        </div>
      </div>
      {right && <div className="flex items-center gap-3 text-foreground">{right}</div>}
    </header>
  );
}
