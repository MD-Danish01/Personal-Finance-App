import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Battery,
  Bell,
  Car,
  ChevronDown,
  ChevronRight,
  Coffee,
  Ellipsis,
  Film,
  Filter,
  Home,
  Laptop,
  LogOut,
  Menu,
  MoveUpRight,
  Plus,
  Receipt,
  Search,
  Settings2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  User,
  Wallet,
  WalletCards,
  Wifi,
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
  | "log-out";

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
};

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }: IconProps) {
  const Component = ICONS[name];
  return <Component size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
