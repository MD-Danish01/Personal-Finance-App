"use client";

import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowRightLeft,
  ArrowUp,
  Battery,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Calendar,
  Car,
  ChartNoAxesCombined,
  ChartPie,
  Check,
  CircleCheckBig,
  ChevronDown,
  ChevronRight,
  Coffee,
  Coins,
  Copy,
  CreditCard,
  Crown,
  Ellipsis,
  Film,
  Filter,
  Goal,
  HandCoins,
  House,
  Landmark,
  ListChecks,
  Laptop2,
  LogOut,
  Moon,
  MoveUpRight,
  Palette,
  PencilLine,
  PiggyBank,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
  UserCircle2,
  WalletMinimal,
  Wifi,
  X,
  Zap,
} from "lucide-react";

export type IconName =
  | "home"
  | "home-filled"
  | "money"
  | "money-filled"
  | "plan"
  | "plan-filled"
  | "target"
  | "target-filled"
  | "insights"
  | "insights-filled"
  | "transfer"
  | "transfer-filled"
  | "bell"
  | "search"
  | "filter"
  | "swap"
  | "chevron-right"
  | "chevron-down"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "calculator"
  | "plus"
  | "shopping-bag"
  | "sparkles"
  | "shield"
  | "trending-up"
  | "wallet"
  | "utensils"
  | "car"
  | "shopping-cart"
  | "film"
  | "receipt"
  | "more"
  | "coffee"
  | "laptop"
  | "palm"
  | "signal"
  | "wifi"
  | "battery"
  | "user"
  | "log-out"
  | "sun"
  | "moon"
  | "settings"
  | "check"
  | "check-circle"
  | "alert-triangle"
  | "x"
  | "credit-card"
  | "calendar"
  | "building"
  | "refresh-cw"
  | "trash-2"
  | "palette"
  | "copy"
  | "pencil"
  | "send"
  | "qr-code";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const ICONS: Record<IconName, LucideIcon> = {
  home: House,
  "home-filled": Landmark,
  money: Coins,
  "money-filled": PiggyBank,
  plan: ListChecks,
  "plan-filled": BriefcaseBusiness,
  target: Goal,
  "target-filled": Crown,
  insights: ChartNoAxesCombined,
  "insights-filled": ChartPie,
  transfer: ArrowRightLeft,
  "transfer-filled": HandCoins,
  bell: Bell,
  search: Search,
  filter: Filter,
  swap: Settings2,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  calculator: Calculator,
  plus: Plus,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  shield: ShieldCheck,
  "trending-up": ChartNoAxesCombined,
  wallet: WalletMinimal,
  utensils: Utensils,
  car: Car,
  "shopping-cart": ShoppingCart,
  film: Film,
  receipt: Receipt,
  more: Ellipsis,
  coffee: Coffee,
  laptop: Laptop2,
  palm: MoveUpRight,
  signal: Signal,
  wifi: Wifi,
  battery: Battery,
  user: UserCircle2,
  "log-out": LogOut,
  sun: Sun,
  moon: Moon,
  settings: Settings,
  check: Check,
  "check-circle": CircleCheckBig,
  "alert-triangle": AlertTriangle,
  x: X,
  "credit-card": CreditCard,
  calendar: Calendar,
  building: Building2,
  "refresh-cw": RefreshCw,
  "trash-2": Trash2,
  palette: Palette,
  copy: Copy,
  pencil: PencilLine,
  send: Zap,
  "qr-code": QrCode,
};

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: IconProps) {
  let scale = 1.0;
  try {
    const theme = useTheme();
    scale = theme.iconScale ?? 1.0;
  } catch {
    scale = 1.0;
  }

  const finalSize = Math.round(size * scale);
  const Component = ICONS[name] ?? Sparkles;
  return <Component size={finalSize} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
