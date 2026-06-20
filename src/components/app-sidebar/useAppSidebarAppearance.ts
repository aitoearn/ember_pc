import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EMBER_COLOR_SCHEME_CHANGED_EVENT,
  EMBER_COLOR_SCHEMES,
  EMBER_COLOR_SCHEME_STORAGE_KEY,
  applyEmberColorScheme,
  getEmberColorScheme,
  loadEmberColorSchemeId,
  persistEmberColorScheme,
  type EmberColorSchemeChangedEventDetail,
  type EmberColorSchemeId,
} from "@/lib/appearance/colorSchemes";
import {
  EMBER_THEME_CHANGED_EVENT,
  EMBER_THEME_MODE_OPTIONS,
  EMBER_THEME_STORAGE_KEY,
  applyEmberThemeMode,
  getEffectiveEmberThemeMode,
  loadEmberThemeMode,
  persistEmberThemeMode,
  type EmberEffectiveThemeMode,
  type EmberThemeChangedEventDetail,
  type EmberThemeMode,
} from "@/lib/appearance/themeMode";

export function useAppSidebarAppearance() {
  const { t } = useTranslation("navigation");
  const [themeState, setThemeState] = useState<{
    themeMode: EmberThemeMode;
    effectiveThemeMode: EmberEffectiveThemeMode;
  }>(() => {
    const themeMode =
      typeof window === "undefined" ? "system" : loadEmberThemeMode();
    return {
      themeMode,
      effectiveThemeMode: getEffectiveEmberThemeMode(themeMode),
    };
  });
  const [colorSchemeId, setColorSchemeId] = useState<EmberColorSchemeId>(() =>
    typeof window === "undefined" ? "ember-classic" : loadEmberColorSchemeId(),
  );
  const [appearancePopoverOpen, setAppearancePopoverOpen] = useState(false);
  const appearanceControlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncThemeFromStorage = () => {
      const themeMode = loadEmberThemeMode();
      const effectiveThemeMode = applyEmberThemeMode(themeMode);
      setThemeState({ themeMode, effectiveThemeMode });
    };

    const syncColorSchemeFromStorage = () => {
      const nextColorSchemeId = loadEmberColorSchemeId();
      applyEmberColorScheme(nextColorSchemeId);
      setColorSchemeId(nextColorSchemeId);
    };

    const handleThemeChanged = (event: Event) => {
      const detail = (event as CustomEvent<EmberThemeChangedEventDetail>).detail;
      const themeMode = detail?.themeMode ?? loadEmberThemeMode();
      const effectiveThemeMode =
        detail?.effectiveThemeMode ?? getEffectiveEmberThemeMode(themeMode);
      setThemeState({ themeMode, effectiveThemeMode });
    };

    const handleColorSchemeChanged = (event: Event) => {
      const detail = (event as CustomEvent<EmberColorSchemeChangedEventDetail>)
        .detail;
      setColorSchemeId(detail?.colorSchemeId ?? loadEmberColorSchemeId());
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === EMBER_THEME_STORAGE_KEY) {
        syncThemeFromStorage();
      }
      if (event.key === null || event.key === EMBER_COLOR_SCHEME_STORAGE_KEY) {
        syncColorSchemeFromStorage();
      }
    };

    const systemThemeQuery = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    );
    const handleSystemThemeChange = () => {
      setThemeState((current) => {
        if (current.themeMode !== "system") {
          return current;
        }

        const effectiveThemeMode = applyEmberThemeMode("system");
        return {
          themeMode: "system",
          effectiveThemeMode,
        };
      });
    };

    syncThemeFromStorage();
    syncColorSchemeFromStorage();

    window.addEventListener(EMBER_THEME_CHANGED_EVENT, handleThemeChanged);
    window.addEventListener(
      EMBER_COLOR_SCHEME_CHANGED_EVENT,
      handleColorSchemeChanged,
    );
    window.addEventListener("storage", handleStorageChange);
    systemThemeQuery?.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener(EMBER_THEME_CHANGED_EVENT, handleThemeChanged);
      window.removeEventListener(
        EMBER_COLOR_SCHEME_CHANGED_EVENT,
        handleColorSchemeChanged,
      );
      window.removeEventListener("storage", handleStorageChange);
      systemThemeQuery?.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!appearancePopoverOpen || typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        appearanceControlRef.current?.contains(target)
      ) {
        return;
      }

      setAppearancePopoverOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAppearancePopoverOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [appearancePopoverOpen]);

  const handleThemeModeChange = useCallback((nextThemeMode: EmberThemeMode) => {
    const themeMode = persistEmberThemeMode(nextThemeMode);
    setThemeState({
      themeMode,
      effectiveThemeMode: getEffectiveEmberThemeMode(themeMode),
    });
  }, []);

  const handleColorSchemeChange = useCallback(
    (nextColorSchemeId: EmberColorSchemeId) => {
      const resolvedColorSchemeId = persistEmberColorScheme(nextColorSchemeId);
      setColorSchemeId(resolvedColorSchemeId);
    },
    [],
  );

  const handleRandomColorScheme = useCallback(() => {
    const candidates = EMBER_COLOR_SCHEMES.filter(
      (scheme) => scheme.id !== colorSchemeId,
    );
    const nextScheme =
      candidates[Math.floor(Math.random() * candidates.length)] ??
      EMBER_COLOR_SCHEMES[0];
    handleColorSchemeChange(nextScheme.id);
  }, [colorSchemeId, handleColorSchemeChange]);

  const currentColorScheme = getEmberColorScheme(colorSchemeId);
  const appearanceThemeCopy = {
    light: {
      label: t("navigation.sidebar.appearance.theme.light.label", "浅色"),
      description: t(
        "navigation.sidebar.appearance.theme.light.description",
        "适合白天和高亮环境。",
      ),
    },
    dark: {
      label: t("navigation.sidebar.appearance.theme.dark.label", "深色"),
      description: t(
        "navigation.sidebar.appearance.theme.dark.description",
        "降低夜间使用时的眩光。",
      ),
    },
    system: {
      label: t("navigation.sidebar.appearance.theme.system.label", "跟随系统"),
      description: t(
        "navigation.sidebar.appearance.theme.system.description",
        "自动同步系统外观。",
      ),
    },
  } satisfies Record<EmberThemeMode, { label: string; description: string }>;
  const appearanceColorSchemeCopy = {
    "ember-classic": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberClassic.label",
        "墨绿",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberClassic.description",
        "经典深绿，温暖米色背景。",
      ),
    },
    "ember-forest": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberForest.label",
        "自然",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberForest.description",
        "舒适放松的清新自然风。",
      ),
    },
    "ember-ocean": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberOcean.label",
        "海洋",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberOcean.description",
        "沉静专业的蓝色调。",
      ),
    },
    "ember-sand": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberSand.label",
        "复古",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberSand.description",
        "温暖怀旧的琥珀色调。",
      ),
    },
    "ember-neon": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberNeon.label",
        "霓虹",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberNeon.description",
        "赛博明亮的粉紫色调。",
      ),
    },
    "ember-citron": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberCitron.label",
        "柠黄",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberCitron.description",
        "活力清新的黄绿配紫。",
      ),
    },
    "ember-dusk": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberDusk.label",
        "黄昏",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberDusk.description",
        "柔和温暖的暮色调。",
      ),
    },
    "ember-minimal": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberMinimal.label",
        "极简",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberMinimal.description",
        "清晰专业的深蓝商务风。",
      ),
    },
    "ember-vivid": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberVivid.label",
        "活力",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberVivid.description",
        "时尚有冲击力的现代科技风。",
      ),
    },
    "ember-literary": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberLiterary.label",
        "文艺",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberLiterary.description",
        "宁静高雅的灰蓝文艺风。",
      ),
    },
    "ember-luxury": {
      label: t(
        "navigation.sidebar.appearance.colorScheme.emberLuxury.label",
        "奢华",
      ),
      description: t(
        "navigation.sidebar.appearance.colorScheme.emberLuxury.description",
        "尊贵权威的黑金商务风。",
      ),
    },
  } satisfies Record<EmberColorSchemeId, { label: string; description: string }>;
  const appearanceThemeOptions = EMBER_THEME_MODE_OPTIONS.map((option) => ({
    ...option,
    ...appearanceThemeCopy[option.id],
  }));
  const appearanceColorSchemes = EMBER_COLOR_SCHEMES.map((scheme) => ({
    ...scheme,
    ...appearanceColorSchemeCopy[scheme.id],
  }));
  const currentThemeLabel =
    appearanceThemeCopy[themeState.themeMode]?.label ??
    appearanceThemeCopy.system.label;
  const currentColorSchemeLabel =
    appearanceColorSchemeCopy[currentColorScheme.id]?.label ??
    currentColorScheme.label;

  return {
    appearanceColorSchemes,
    appearanceControlRef,
    appearancePopoverOpen,
    appearanceThemeOptions,
    colorSchemeId,
    currentColorScheme,
    handleColorSchemeChange,
    handleRandomColorScheme,
    handleThemeModeChange,
    setAppearancePopoverOpen,
    themeState,
    copy: {
      colorSchemeGroupLabel: t(
        "navigation.sidebar.appearance.colorScheme.group",
        "配色",
      ),
      entryLabel: t(
        "navigation.sidebar.appearance.entry.label",
        "快速切换外观",
      ),
      formatColorSchemeSwitchAria: (colorScheme: string) =>
        t("navigation.sidebar.appearance.colorScheme.switchAria", {
          colorScheme,
          defaultValue: "切换配色为{{colorScheme}}",
        }),
      formatThemeSwitchAria: (theme: string) =>
        t("navigation.sidebar.appearance.theme.switchAria", {
          theme,
          defaultValue: "切换主题为{{theme}}",
        }),
      randomColorSchemeAriaLabel: t(
        "navigation.sidebar.appearance.colorScheme.random.ariaLabel",
        "随机切换配色",
      ),
      randomColorSchemeLabel: t(
        "navigation.sidebar.appearance.colorScheme.random.label",
        "随机",
      ),
      randomColorSchemeTitle: t(
        "navigation.sidebar.appearance.colorScheme.random.title",
        "随机切换一个颜色主题",
      ),
      summaryLabel: t("navigation.sidebar.appearance.dialog.summary", {
        theme: currentThemeLabel,
        colorScheme: currentColorSchemeLabel,
        defaultValue: "{{theme}} · {{colorScheme}}",
      }),
      themeGroupLabel: t(
        "navigation.sidebar.appearance.theme.group",
        "主题",
      ),
      titleLabel: t("navigation.sidebar.appearance.dialog.title", "外观"),
    },
  };
}
