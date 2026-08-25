"use client";

import { useTheme, type ThemeColor, type ThemeMode } from "@/components/providers/ThemeProvider";
import { Icon } from "@/components/ui/Icon";

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
  const { themeColor, themeMode, setThemeColor, setThemeMode, isSaving } = useTheme();

  return (
    <div className="space-y-5">
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
