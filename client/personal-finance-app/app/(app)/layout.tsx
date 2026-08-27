import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { DesktopSidebar } from "@/components/ui/DesktopSidebar";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";
import { DraggableChatbotButton } from "@/components/ai/DraggableChatbotButton";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <AuthSessionProvider session={session}>
      {/* Desktop Sidebar - hidden automatically on mobile */}
      <DesktopSidebar />

      {/* Main Application */}
      <AppShell>
        {children}

        {/* Bottom Navigation - mobile only */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </AppShell>

      {/* Movable AI Copilot */}
      <DraggableChatbotButton />
    </AuthSessionProvider>
  );
}