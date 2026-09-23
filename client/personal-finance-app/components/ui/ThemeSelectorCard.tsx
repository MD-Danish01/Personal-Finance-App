"use client";

import {
  useTheme,
  type ThemeColor,
  type ThemeMode,
  type IconSizeScale,
} from "@/components/providers/ThemeProvider";
import { Icon } from "@/components/ui/Icon";

const ICON_SIZE_OPTIONS: {
  id: IconSizeScale;
  label: string;
  sublabel: string;
  iconName: "sparkles" | "target" | "palette";
}[] = [
  { id: "small", label: "Compact", sublabel: "85% scale", iconName: "sparkles" },
  { id: "medium", label: "Standard", sublabel: "100% (Default)", iconName: "target" },
  { id: "large", label: "Cozy", sublabel: "120% scale", iconName: "palette" },
];

const COLOR_OPTIONS: { id: ThemeColor; name: string; bgClass: string; borderClass: string }[] = [
  {
    id: "emerald",
    name: "Emerald",
    bgClass: "bg-emerald-500",
    borderClass: "border-emerald-500",
  },
  {
    id: "indigo",
    name: "Indigo",
    bgClass: "bg-indigo-500",
    borderClass: "border-indigo-500",
  },
  {
    id: "blue",
    name: "Ocean",
    bgClass: "bg-blue-600",
    borderClass: "border-blue-600",
  },
  {
    id: "violet",
    name: "Violet",
    bgClass: "bg-purple-600",
    borderClass: "border-purple-600",
  },
  {
    id: "amber",
    name: "Amber",
    bgClass: "bg-amber-500",
    borderClass: "border-amber-500",
  },
  {
    id: "rose",
    name: "Rose",
    bgClass: "bg-rose-500",
    borderClass: "border-rose-500",
  },
];

const MODE_OPTIONS: { id: ThemeMode; label: string; icon: "sun" | "moon" | "settings" }[] = [
  { id: "light", label: "Light", icon: "sun" },
  { id: "dark", label: "Dark", icon: "moon" },
  { id: "system", label: "System", icon: "settings" },
];

export function ThemeSelectorCard() {
  const {
    themeColor,
    themeMode,
    iconSize,
    setThemeColor,
    setThemeMode,
    setIconSize,
    isSaving,
  } = useTheme();

  return (
    <div className="space-y-6">
      {/* Theme Mode Segmented Control */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Appearance Mode
          </label>
          {isSaving && (
            <span className="text-[11px] text-muted flex items-center gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Saving...
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted-bg border border-card-border">
          {MODE_OPTIONS.map((mode) => {
            const isActive = themeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setThemeMode(mode.id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-card-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon name={mode.icon} size={15} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon & Visual Size Segmented Control */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Icon &amp; Visual Sizing
          </label>
          <span className="text-[11px] text-muted">
            {iconSize === "small"
              ? "Compact"
              : iconSize === "large"
              ? "Cozy (Enlarged)"
              : "Standard"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ICON_SIZE_OPTIONS.map((opt) => {
            const isActive = iconSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setIconSize(opt.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary-soft/50 border-primary ring-1 ring-primary text-foreground shadow-xs"
                    : "bg-muted-bg/60 border-card-border hover:bg-muted-bg text-muted"
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-lg transition-transform ${
                    isActive ? "text-primary" : "text-muted"
                  }`}
                >
                  <Icon
                    name={opt.iconName}
                    size={opt.id === "small" ? 15 : opt.id === "large" ? 22 : 18}
                  />
                </span>
                <span
                  className={`text-xs font-bold ${
                    isActive ? "text-foreground" : "text-foreground/80"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted leading-tight">{opt.sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Color Palette Picker */}
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
          Primary Accent Color
        </label>
        <div className="grid grid-cols-6 gap-2.5">
          {COLOR_OPTIONS.map((color) => {
            const isSelected = themeColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => setThemeColor(color.id)}
                title={color.name}
                aria-label={`Select ${color.name} primary color`}
                className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-primary-soft/60 ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:bg-muted-bg"
                }`}
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${color.bgClass} ${
                    isSelected ? "scale-105" : "group-hover:scale-105"
                  }`}
                >
                  {isSelected && (
                    <Icon name="check" size={16} className="text-white drop-shadow-sm" />
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isSelected ? "text-primary font-bold" : "text-muted"
                  }`}
                >
                  {color.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
