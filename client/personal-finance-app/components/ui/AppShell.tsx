import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto w-full max-w-md pt-safe">
      <main className="pb-safe min-h-screen">{children}</main>
    </div>
  );
}
