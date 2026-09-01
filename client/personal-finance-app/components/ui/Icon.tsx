import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Battery,
  Bell,
  Building,
  Calculator,
  Calendar,
  Car,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Coffee,
  Copy,
  CreditCard,
  Ellipsis,
  Film,
  Filter,
  Home,
  Laptop,
  LogOut,
  Menu,
  Moon,
  MoveUpRight,
  Palette,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Utensils,
  User,
  Wallet,
  WalletCards,
  Wifi,
  X,
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
  | "copy";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  "home-filled": Home,
  money: WalletCards,
  "money-filled": WalletCards,
  plan: Menu,
  "plan-filled": Menu,
  target: Target,
  "target-filled": Target,
  insights: TrendingUp,
  "insights-filled": TrendingUp,
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
  shield: Shield,
  "trending-up": TrendingUp,
  wallet: Wallet,
  utensils: Utensils,
  car: Car,
  "shopping-cart": ShoppingCart,
  film: Film,
  receipt: Receipt,
  more: Ellipsis,
  coffee: Coffee,
  laptop: Laptop,
  palm: MoveUpRight,
  signal: Signal,
  wifi: Wifi,
  battery: Battery,
  user: User,
  "log-out": LogOut,
  sun: Sun,
  moon: Moon,
  settings: Settings,
  check: Check,
  "check-circle": CheckCircle,
  "alert-triangle": AlertTriangle,
  x: X,
  "credit-card": CreditCard,
  calendar: Calendar,
  building: Building,
  "refresh-cw": RefreshCw,
  "trash-2": Trash2,
  palette: Palette,
  copy: Copy,
};

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: IconProps) {
  const Component = ICONS[name] ?? Sparkles;
  return <Component size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
