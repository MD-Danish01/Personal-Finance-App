import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen w-full bg-background md:pl-64">
      <main className="min-h-screen w-full max-w-6xl mx-auto px-5 md:px-8 lg:px-10 pb-safe">
        {children}
      </main>
    </div>
  );
}