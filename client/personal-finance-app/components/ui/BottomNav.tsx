"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

interface Tab {
  label: string;
  href: string;
  icon: IconName;
  activeIcon: IconName;
}

const TABS: Tab[] = [
  { label: "Home", href: "/home", icon: "home", activeIcon: "home-filled" },
  { label: "Money", href: "/money", icon: "money", activeIcon: "money-filled" },
  { label: "Plan", href: "/plan", icon: "plan", activeIcon: "plan-filled" },
  { label: "Goals", href: "/goals", icon: "target", activeIcon: "target-filled" },
  {
    label: "Insights",
    href: "/insights",
    icon: "insights",
    activeIcon: "insights-filled",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5 px-2 py-2">
        {TABS.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-brand-purple"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon name={isActive ? tab.activeIcon : tab.icon} size={22} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
