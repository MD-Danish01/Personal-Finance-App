import type { ReactNode } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
      <BottomNav />
    </AppShell>
  );
}
