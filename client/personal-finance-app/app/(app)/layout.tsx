import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <AuthSessionProvider session={session}>
      <AppShell>
        {children}
        <BottomNav />
      </AppShell>
    </AuthSessionProvider>
  );
}
