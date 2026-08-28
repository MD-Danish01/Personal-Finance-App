"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/money", label: "Money", icon: "wallet" },
  { href: "/plan", label: "Plan", icon: "plan" },
  { href: "/goals", label: "Goals", icon: "target" },
  { href: "/insights", label: "Insights", icon: "trending-up" },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r border-border bg-background/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-border">
        <Image
          src="/app-logo.svg"
          alt="Personal Finance"
          width={42}
          height={42}
          priority
        />
        <div>
          <h2 className="font-bold text-foreground">Spendly</h2>
          <p className="text-[10px] text-muted">Financial Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-2 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted hover:bg-muted-bg hover:text-foreground"
              }`}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div className="border-t border-border p-5">
        <div className="rounded-xl bg-muted-bg p-3">
          <p className="text-xs font-semibold text-foreground">
            Your money, smarter.
          </p>
          <p className="mt-1 text-[10px] text-muted">
            Powered by Financial Copilot
          </p>
        </div>
      </div>
    </aside>
  );
}
