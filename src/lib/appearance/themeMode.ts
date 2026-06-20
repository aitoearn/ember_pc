import { applyEmberColorScheme, loadEmberColorSchemeId } from "./colorSchemes";

export const EMBER_THEME_STORAGE_KEY = "theme";
export const EMBER_THEME_CHANGED_EVENT = "ember-theme-changed";

export type EmberThemeMode = "light" | "dark" | "system";
export type EmberEffectiveThemeMode = "light" | "dark";

export interface EmberThemeModeOption {
  id: EmberThemeMode;
  label: string;
  description: string;
}

export interface EmberThemeChangedEventDetail {
  themeMode: EmberThemeMode;
  effectiveThemeMode: EmberEffectiveThemeMode;
}

export const EMBER_THEME_MODE_OPTIONS: readonly EmberThemeModeOption[] = [
  {
    id: "light",
    label: "浅色",
    description: "适合白天和高亮环境。",
  },
  {
    id: "dark",
    label: "深色",
    description: "降低夜间使用时的眩光。",
  },
  {
    id: "system",
    label: "跟随系统",
    description: "自动同步系统外观。",
  },
];

const themeModes = new Set<EmberThemeMode>(["light", "dark", "system"]);
let systemThemeCleanup: (() => void) | null = null;

export function resolveEmberThemeMode(
  value: string | null | undefined,
): EmberThemeMode {
  return themeModes.has(value as EmberThemeMode)
    ? (value as EmberThemeMode)
    : "system";
}

export function getSystemEmberThemeMode(): EmberEffectiveThemeMode {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getEffectiveEmberThemeMode(
  themeMode: EmberThemeMode,
): EmberEffectiveThemeMode {
  return themeMode === "system" ? getSystemEmberThemeMode() : themeMode;
}

export function loadEmberThemeMode(): EmberThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  return resolveEmberThemeMode(
    window.localStorage.getItem(EMBER_THEME_STORAGE_KEY),
  );
}

export function applyEmberThemeMode(themeMode: string): EmberEffectiveThemeMode {
  const resolvedThemeMode = resolveEmberThemeMode(themeMode);
  const effectiveThemeMode = getEffectiveEmberThemeMode(resolvedThemeMode);

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(
      "dark",
      effectiveThemeMode === "dark",
    );
    document.documentElement.dataset.emberTheme = resolvedThemeMode;
    document.documentElement.dataset.emberThemeEffective = effectiveThemeMode;
    applyEmberColorScheme(loadEmberColorSchemeId(), { effectiveThemeMode });
  }

  return effectiveThemeMode;
}

function dispatchEmberThemeChanged(
  themeMode: EmberThemeMode,
  effectiveThemeMode: EmberEffectiveThemeMode,
) {
  if (typeof window === "undefined") {
    return;
  }

  const detail: EmberThemeChangedEventDetail = {
    themeMode,
    effectiveThemeMode,
  };
  window.dispatchEvent(new CustomEvent(EMBER_THEME_CHANGED_EVENT, { detail }));
}

export function bindEmberSystemThemeModeListener(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }

  if (systemThemeCleanup) {
    return systemThemeCleanup;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChanged = () => {
    if (loadEmberThemeMode() !== "system") {
      return;
    }

    const effectiveThemeMode = applyEmberThemeMode("system");
    dispatchEmberThemeChanged("system", effectiveThemeMode);
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleSystemThemeChanged);
  } else {
    mediaQuery.addListener?.(handleSystemThemeChanged);
  }

  systemThemeCleanup = () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener("change", handleSystemThemeChanged);
    } else {
      mediaQuery.removeListener?.(handleSystemThemeChanged);
    }
    systemThemeCleanup = null;
  };

  return systemThemeCleanup;
}

export function initializeEmberThemeMode(): EmberEffectiveThemeMode {
  const effectiveThemeMode = applyEmberThemeMode(loadEmberThemeMode());
  bindEmberSystemThemeModeListener();
  return effectiveThemeMode;
}

export function persistEmberThemeMode(themeMode: string): EmberThemeMode {
  const resolvedThemeMode = resolveEmberThemeMode(themeMode);
  const effectiveThemeMode = applyEmberThemeMode(resolvedThemeMode);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(EMBER_THEME_STORAGE_KEY, resolvedThemeMode);
    dispatchEmberThemeChanged(resolvedThemeMode, effectiveThemeMode);
  }

  return resolvedThemeMode;
}
