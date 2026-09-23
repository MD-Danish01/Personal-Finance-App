"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ThemeColor =
  | "emerald"
  | "indigo"
  | "blue"
  | "violet"
  | "amber"
  | "rose";

export type ThemeMode = "light" | "dark" | "system";

export type IconSizeScale = "small" | "medium" | "large";

export interface ThemeContextValue {
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  iconSize: IconSizeScale;
  iconScale: number;
  resolvedMode: "light" | "dark";
  setThemeColor: (color: ThemeColor) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setIconSize: (size: IconSizeScale) => void;
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_COLOR_KEY = "pfa_theme_color";
const STORAGE_MODE_KEY = "pfa_theme_mode";
const STORAGE_ICON_SIZE_KEY = "pfa_icon_size";

function getInitialColor(): ThemeColor {
  if (typeof window === "undefined") return "emerald";
  return (localStorage.getItem(STORAGE_COLOR_KEY) as ThemeColor) || "emerald";
}

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode) || "system";
}

function getInitialIconSize(): IconSizeScale {
  if (typeof window === "undefined") return "medium";
  return (localStorage.getItem(STORAGE_ICON_SIZE_KEY) as IconSizeScale) || "medium";
}

const SCALE_MAP: Record<IconSizeScale, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.2,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(getInitialColor);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialMode);
  const [iconSize, setIconSizeState] = useState<IconSizeScale>(getInitialIconSize);
  const [isSaving, setIsSaving] = useState(false);

  const iconScale = SCALE_MAP[iconSize] ?? 1.0;

  const resolvedMode: "light" | "dark" =
    themeMode === "dark"
      ? "dark"
      : themeMode === "light"
      ? "light"
      : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // Apply theme attributes to DOM
  const applyDomTheme = useCallback((color: ThemeColor, mode: ThemeMode, iSize: IconSizeScale) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.setAttribute("data-theme-color", color);
    root.setAttribute("data-icon-size", iSize);

    let effectiveMode: "light" | "dark" = "light";
    if (mode === "dark") {
      effectiveMode = "dark";
    } else if (mode === "light") {
      effectiveMode = "light";
    } else {
      effectiveMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    if (effectiveMode === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme-mode", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme-mode", "light");
    }
  }, []);

  // Initial load: sync with DB and listen for system color changes
  useEffect(() => {
    let ignore = false;

    // Apply active theme to DOM immediately without calling setState
    applyDomTheme(themeColor, themeMode, iconSize);

    // Sync from database if user is logged in
    async function syncTheme() {
      try {
        const res = await fetch("/api/profile/theme");
        if (!res.ok || ignore) return;
        const data = await res.json();
        if (data?.themeColor || data?.themeMode) {
          const remoteColor = data.themeColor || themeColor;
          const remoteMode = data.themeMode || themeMode;
          if (!ignore) {
            setThemeColorState(remoteColor);
            setThemeModeState(remoteMode);
            localStorage.setItem(STORAGE_COLOR_KEY, remoteColor);
            localStorage.setItem(STORAGE_MODE_KEY, remoteMode);
            applyDomTheme(remoteColor, remoteMode, iconSize);
          }
        }
      } catch {
        // Silently continue with local storage value
      }
    }

    syncTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentMode = (localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode) || "system";
      if (currentMode === "system") {
        applyDomTheme(
          (localStorage.getItem(STORAGE_COLOR_KEY) as ThemeColor) || "emerald",
          "system",
          (localStorage.getItem(STORAGE_ICON_SIZE_KEY) as IconSizeScale) || "medium",
        );
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      ignore = true;
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [applyDomTheme, themeColor, themeMode, iconSize]);

  // Persist theme changes
  const saveToBackend = useCallback(async (color: ThemeColor, mode: ThemeMode) => {
    setIsSaving(true);
    try {
      await fetch("/api/profile/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor: color, themeMode: mode }),
      });
    } catch {
      // Ignore network errors on theme save; local state takes precedence
    } finally {
      setIsSaving(false);
    }
  }, []);

  const setThemeColor = useCallback(
    (color: ThemeColor) => {
      setThemeColorState(color);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_COLOR_KEY, color);
      }
      applyDomTheme(color, themeMode, iconSize);
      saveToBackend(color, themeMode);
    },
    [themeMode, iconSize, applyDomTheme, saveToBackend],
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_MODE_KEY, mode);
      }
      applyDomTheme(themeColor, mode, iconSize);
      saveToBackend(themeColor, mode);
    },
    [themeColor, iconSize, applyDomTheme, saveToBackend],
  );

  const setIconSize = useCallback(
    (size: IconSizeScale) => {
      setIconSizeState(size);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_ICON_SIZE_KEY, size);
      }
      applyDomTheme(themeColor, themeMode, size);
    },
    [themeColor, themeMode, applyDomTheme],
  );

  return (
    <ThemeContext.Provider
      value={{
        themeColor,
        themeMode,
        iconSize,
        iconScale,
        resolvedMode,
        setThemeColor,
        setThemeMode,
        setIconSize,
        isSaving,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
