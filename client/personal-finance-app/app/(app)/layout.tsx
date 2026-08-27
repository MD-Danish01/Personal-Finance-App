import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    
    <AuthSessionProvider session={session}>
      <Link
  href="/"
  className="fixed top-4 left-4 z-[9999]"
>
  <Image
    src="/app-logo.svg"
    alt="Personal Finance"
    width={48}
    height={48}
  
    priority
  />
</Link>
      <AppShell>
     {children}
        <BottomNav />
      </AppShell>
    </AuthSessionProvider>
  );
}
