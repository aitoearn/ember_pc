import { syncThemeAccentFromEmberVariables } from "./themeAccent";

export const EMBER_COLOR_SCHEME_STORAGE_KEY = "ember.appearance.color-scheme";
export const EMBER_COLOR_SCHEME_CHANGED_EVENT = "ember-color-scheme-changed";

export const DEFAULT_EMBER_COLOR_SCHEME_ID = "ember-classic";

export type EmberColorSchemeId =
  | "ember-classic"
  | "ember-forest"
  | "ember-ocean"
  | "ember-sand"
  | "ember-neon"
  | "ember-citron"
  | "ember-dusk"
  | "ember-minimal"
  | "ember-vivid"
  | "ember-literary"
  | "ember-luxury";

export interface EmberColorScheme {
  id: EmberColorSchemeId;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
  variables: Record<string, string>;
}

export interface EmberColorSchemeChangedEventDetail {
  colorSchemeId: EmberColorSchemeId;
}

type EmberColorSchemeEffectiveThemeMode = "light" | "dark";

const classicVariables = {
  "--theme-lighter": "#FEF4D4",
  "--theme-light": "#FED680",
  "--theme-default": "#FDA92D",
  "--theme-dark": "#B66816",
  "--theme-darker": "#793908",
  "--ember-text-strong": "#1a1915",
  "--ember-text": "#4a4a45",
  "--ember-text-muted": "#9b9b96",
  "--ember-surface": "#ffffff",
  "--ember-surface-subtle": "#faf9f6",
  "--ember-surface-soft": "#f7f6f3",
  "--ember-surface-muted": "#f0efec",
  "--ember-surface-hover": "#f7f6f3",
  "--ember-surface-border": "#ececea",
  "--ember-surface-border-strong": "#deddda",
  "--ember-shadow-color": "rgba(15, 23, 42, 0.08)",
  "--ember-app-bg": "#faf9f6",
  "--ember-shell-surface": "linear-gradient(180deg, #faf9f6 0%, #f7f6f3 100%)",
  "--ember-stage-surface":
    "linear-gradient(180deg, #faf9f6 0%, #f7f6f3 54%, #faf9f6 100%)",
  "--ember-stage-surface-soft":
    "linear-gradient(180deg, rgba(250, 249, 246, 0.98) 0%, rgba(247, 246, 243, 0.94) 100%)",
  "--ember-stage-surface-top": "#faf9f6",
  "--ember-card-subtle":
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,249,246,0.98) 100%)",
  "--ember-card-subtle-border": "rgba(236, 236, 234, 0.92)",
  "--ember-divider-subtle": "rgba(155, 155, 150, 0.18)",
  "--ember-brand-strong": "#B66816",
  "--ember-brand": "#FDA92D",
  "--ember-brand-muted": "#FED680",
  "--ember-brand-soft": "#FEF4D4",
  "--ember-info": "#0284c7",
  "--ember-info-soft": "#f0f9ff",
  "--ember-info-border": "#bfdbfe",
  "--ember-warning": "#b45309",
  "--ember-warning-soft": "#fffbeb",
  "--ember-warning-border": "#fde68a",
  "--ember-danger": "#be123c",
  "--ember-danger-soft": "#fff1f2",
  "--ember-danger-border": "#fecdd3",
  "--ember-focus-ring": "rgba(0, 167, 111, 0.18)",
  "--ember-chrome-rail": "#faf9f6",
  "--ember-chrome-rail-surface":
    "linear-gradient(180deg, #faf9f6 0%, #f7f6f3 100%)",
  "--ember-chrome-surface": "#faf9f6",
  "--ember-chrome-active-tab": "#ffffff",
  "--ember-chrome-tab-hover": "#f7f6f3",
  "--ember-chrome-tab-active-surface": "#ffffff",
  "--ember-chrome-border": "#ececea",
  "--ember-chrome-divider": "rgba(155, 155, 150, 0.16)",
  "--ember-chrome-stage-blend":
    "linear-gradient(180deg, #faf9f6 0%, #faf9f6 58%, #faf9f6 100%)",
  "--ember-chrome-stage-seam": "rgba(155, 155, 150, 0.08)",
  "--ember-chrome-shadow-subtle": "0 10px 22px -30px rgba(15, 23, 42, 0.18)",
  "--ember-chrome-text": "#4a4a45",
  "--ember-chrome-muted": "#9b9b96",
  "--ember-sidebar-surface":
    "linear-gradient(180deg, #eef3e9 0%, #f4f7f0 46%, #f7faf4 100%)",
  "--ember-sidebar-surface-top": "#eef3e9",
  "--ember-sidebar-surface-middle": "#f4f7f0",
  "--ember-sidebar-surface-bottom": "#f7faf4",
  "--ember-sidebar-border": "rgba(203, 214, 196, 0.82)",
  "--ember-sidebar-divider": "rgba(143, 154, 132, 0.18)",
  "--ember-sidebar-hover": "#edf2e8",
  "--ember-sidebar-active": "#e7efe1",
  "--ember-sidebar-active-text": "#166534",
  "--ember-sidebar-search-bg": "#f9fbf6",
  "--ember-sidebar-search-hover": "#f1f5ec",
  "--ember-sidebar-search-border-hover": "#cbd8c4",
  "--ember-sidebar-card-surface":
    "linear-gradient(180deg, #f9fbf6 0%, #f2f6ee 100%)",
  "--ember-sidebar-card-border": "rgba(205, 216, 200, 0.72)",
  "--ember-sidebar-card-highlight": "rgba(255, 255, 255, 0.54)",
  "--ember-sidebar-card-shadow": "0 14px 28px -26px rgba(15, 23, 42, 0.32)",
  "--ember-sidebar-glow-primary": "rgba(132, 154, 107, 0.035)",
  "--ember-sidebar-glow-secondary": "rgba(47, 125, 80, 0.025)",
  "--ember-sidebar-glow-tertiary": "rgba(186, 230, 253, 0.035)",
  "--ember-home-bg-start": "#f8fcf7",
  "--ember-home-bg-mid": "#f9fbf8",
  "--ember-home-bg-end": "#f5faf7",
  "--ember-home-glow-primary": "rgba(132, 204, 22, 0.055)",
  "--ember-home-glow-secondary": "rgba(186, 230, 253, 0.11)",
  "--ember-home-title-gradient":
    "linear-gradient(90deg, #163b2c 0%, #23714b 34%, #6f955d 62%, #23714b 100%)",
  "--ember-home-title-shadow":
    "0 0 8px rgba(132, 204, 22, 0.1), 0 12px 24px rgba(46, 125, 78, 0.08)",
  "--ember-home-dot-gradient":
    "linear-gradient(135deg, rgba(124, 174, 72, 0.86), rgba(34, 142, 86, 0.78))",
  "--ember-home-dot-shadow":
    "0 0 0 12px rgba(132, 204, 22, 0.075), 0 0 18px rgba(34, 142, 86, 0.18)",
  "--ember-home-beam-gradient":
    "linear-gradient(90deg, rgba(132, 204, 22, 0) 0%, rgba(132, 204, 22, 0.075) 24%, rgba(255, 255, 255, 0.3) 50%, rgba(14, 165, 233, 0.08) 76%, rgba(132, 204, 22, 0) 100%)",
  "--ember-home-card-surface":
    "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(247,254,231,0.9) 100%)",
  "--ember-home-card-surface-strong":
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,249,255,0.94))",
  "--ember-home-card-border": "rgba(197, 222, 213, 0.88)",
  "--ember-home-card-border-muted": "rgba(219, 234, 224, 0.92)",
  "--ember-home-card-hover-border": "#b7d9c6",
  "--ember-composer-surface":
    "linear-gradient(180deg, #fdfffb 0%, #f6fbf7 100%)",
  "--ember-composer-shell": "linear-gradient(180deg, #fdfffb 0%, #f6fbf7 100%)",
  "--ember-composer-surface-floating":
    "radial-gradient(circle at top right, rgba(220, 252, 231, 0.48), rgba(255, 255, 255, 0) 34%), linear-gradient(180deg, #ffffff 0%, #f7fcf8 100%)",
  "--ember-composer-surface-focus":
    "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
  "--ember-composer-border": "rgba(163, 213, 184, 0.72)",
  "--ember-composer-border-focus": "rgba(52, 171, 103, 0.52)",
  "--ember-primary-gradient":
    "linear-gradient(135deg,#0ea5e9 0%,#14b8a6 52%,#10b981 100%)",
  "--ember-primary-gradient-simple":
    "linear-gradient(135deg,#0ea5e9 0%,#10b981 100%)",
};

const darkThemeVariableOverrides = {
  "--ember-text-strong": "#f1f5f9",
  "--ember-text": "#d7e3df",
  "--ember-text-muted": "#94a3b8",
  "--ember-surface": "#0f172a",
  "--ember-surface-subtle": "#111827",
  "--ember-surface-soft": "#172033",
  "--ember-surface-muted": "#1f2937",
  "--ember-surface-hover": "#223047",
  "--ember-surface-border": "rgba(148, 163, 184, 0.22)",
  "--ember-surface-border-strong": "rgba(148, 163, 184, 0.36)",
  "--ember-shadow-color": "rgba(2, 8, 23, 0.44)",
  "--ember-app-bg": "#0b1120",
  "--ember-shell-surface": "linear-gradient(180deg, #0b1120 0%, #101827 100%)",
  "--ember-stage-surface":
    "linear-gradient(180deg, #101827 0%, #0b1120 56%, #101827 100%)",
  "--ember-stage-surface-soft":
    "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(11,17,32,0.96) 100%)",
  "--ember-stage-surface-top": "#101827",
  "--ember-card-subtle":
    "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.98) 100%)",
  "--ember-card-subtle-border": "rgba(148, 163, 184, 0.24)",
  "--ember-divider-subtle": "rgba(148, 163, 184, 0.16)",
  "--ember-brand-strong": "#86efac",
  "--ember-brand": "#34d399",
  "--ember-brand-muted": "#6ee7b7",
  "--ember-brand-soft": "rgba(16, 185, 129, 0.14)",
  "--ember-info": "#7dd3fc",
  "--ember-info-soft": "rgba(14, 165, 233, 0.14)",
  "--ember-info-border": "rgba(125, 211, 252, 0.28)",
  "--ember-warning": "#fbbf24",
  "--ember-warning-soft": "rgba(245, 158, 11, 0.16)",
  "--ember-warning-border": "rgba(251, 191, 36, 0.3)",
  "--ember-danger": "#fb7185",
  "--ember-danger-soft": "rgba(244, 63, 94, 0.14)",
  "--ember-danger-border": "rgba(251, 113, 133, 0.3)",
  "--ember-focus-ring": "rgba(125, 211, 252, 0.2)",
  "--ember-chrome-rail": "#0b1120",
  "--ember-chrome-rail-surface":
    "linear-gradient(180deg, #0b1120 0%, #111827 100%)",
  "--ember-chrome-surface": "#111827",
  "--ember-chrome-active-tab": "#182235",
  "--ember-chrome-tab-hover": "#172033",
  "--ember-chrome-tab-active-surface": "#182235",
  "--ember-chrome-border": "rgba(148, 163, 184, 0.22)",
  "--ember-chrome-divider": "rgba(148, 163, 184, 0.16)",
  "--ember-chrome-stage-blend":
    "radial-gradient(circle at 18% 100%, rgba(16, 185, 129, 0.07), transparent 42%), radial-gradient(circle at 78% 115%, rgba(56, 189, 248, 0.08), transparent 46%), linear-gradient(180deg, #111827 0%, #0f172a 58%, #0b1120 100%)",
  "--ember-chrome-stage-seam": "rgba(148, 163, 184, 0.1)",
  "--ember-chrome-shadow-subtle": "0 16px 34px -28px rgba(2, 8, 23, 0.72)",
  "--ember-chrome-text": "#e2e8f0",
  "--ember-chrome-muted": "#94a3b8",
  "--ember-sidebar-surface":
    "linear-gradient(180deg, #0b1120 0%, #101827 48%, #111827 100%)",
  "--ember-sidebar-surface-top": "#0b1120",
  "--ember-sidebar-surface-middle": "#101827",
  "--ember-sidebar-surface-bottom": "#111827",
  "--ember-sidebar-border": "rgba(148, 163, 184, 0.22)",
  "--ember-sidebar-divider": "rgba(148, 163, 184, 0.14)",
  "--ember-sidebar-hover": "#172033",
  "--ember-sidebar-active": "#183225",
  "--ember-sidebar-active-text": "#86efac",
  "--ember-sidebar-search-bg": "#111827",
  "--ember-sidebar-search-hover": "#172033",
  "--ember-sidebar-search-border-hover": "rgba(148, 163, 184, 0.34)",
  "--ember-sidebar-card-surface":
    "linear-gradient(180deg, #111827 0%, #172033 100%)",
  "--ember-sidebar-card-border": "rgba(148, 163, 184, 0.24)",
  "--ember-sidebar-card-highlight": "rgba(255,255,255,0.06)",
  "--ember-sidebar-card-shadow": "0 18px 34px -28px rgba(2, 8, 23, 0.72)",
  "--ember-sidebar-glow-primary": "rgba(16, 185, 129, 0.08)",
  "--ember-sidebar-glow-secondary": "rgba(20, 184, 166, 0.05)",
  "--ember-sidebar-glow-tertiary": "rgba(56, 189, 248, 0.08)",
  "--ember-home-bg-start": "#0b1120",
  "--ember-home-bg-mid": "#0f172a",
  "--ember-home-bg-end": "#111827",
  "--ember-home-glow-primary": "rgba(16, 185, 129, 0.11)",
  "--ember-home-glow-secondary": "rgba(56, 189, 248, 0.12)",
  "--ember-home-title-gradient":
    "linear-gradient(90deg, #f1f5f9 0%, #86efac 44%, #7dd3fc 100%)",
  "--ember-home-title-shadow": "0 14px 30px rgba(2, 8, 23, 0.34)",
  "--ember-home-dot-shadow":
    "0 0 0 10px rgba(16, 185, 129, 0.1), 0 0 20px rgba(56, 189, 248, 0.16)",
  "--ember-home-beam-gradient":
    "linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.12) 28%, rgba(255,255,255,0.16) 50%, rgba(56,189,248,0.12) 72%, rgba(16,185,129,0) 100%)",
  "--ember-home-card-surface":
    "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.96) 100%)",
  "--ember-home-card-surface-strong":
    "linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.96))",
  "--ember-home-card-border": "rgba(148, 163, 184, 0.28)",
  "--ember-home-card-border-muted": "rgba(148, 163, 184, 0.2)",
  "--ember-home-card-hover-border": "rgba(125, 211, 252, 0.42)",
  "--ember-composer-surface":
    "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
  "--ember-composer-shell": "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
  "--ember-composer-surface-floating":
    "radial-gradient(circle at top right, rgba(16,185,129,0.14), rgba(15,23,42,0) 34%), linear-gradient(180deg, #111827 0%, #0f172a 100%)",
  "--ember-composer-surface-focus":
    "linear-gradient(180deg, #111827 0%, #132033 100%)",
  "--ember-composer-border": "rgba(148, 163, 184, 0.28)",
  "--ember-composer-border-focus": "rgba(125, 211, 252, 0.46)",
};

function withPalette(overrides: Partial<typeof classicVariables>) {
  return {
    ...classicVariables,
    ...overrides,
  };
}

export const EMBER_COLOR_SCHEMES: readonly EmberColorScheme[] = [
  {
    id: "ember-classic",
    label: "熠测",
    description: "经典深绿，温暖米色背景。",
    swatches: ["#f8fcf7", "#10b981", "#0ea5e9"],
    variables: classicVariables,
  },
  {
    id: "ember-forest",
    label: "自然",
    description: "舒适放松的清新自然风。",
    swatches: ["#f4f7f1", "#2f6f46", "#8aa16e"],
    variables: withPalette({
      "--ember-text": "#233c31",
      "--ember-text-muted": "#667564",
      "--ember-surface-soft": "#f4f7f1",
      "--ember-surface-muted": "#edf3e8",
      "--ember-surface-border": "#dce8d5",
      "--ember-surface-border-strong": "#c9d8bf",
      "--ember-brand-strong": "#234f36",
      "--ember-brand": "#2f6f46",
      "--ember-brand-muted": "#6f8f53",
      "--ember-brand-soft": "#eef4e8",
      "--ember-info": "#3b7066",
      "--ember-info-soft": "#edf6f3",
      "--ember-info-border": "#bcd8d0",
      "--ember-focus-ring": "rgba(111, 143, 83, 0.16)",
      "--ember-app-bg": "#f3f6ef",
      "--ember-shell-surface":
        "linear-gradient(180deg, #eef4e8 0%, #f7faf4 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #f7faf5 0%, #f3f6ef 56%, #f8faf5 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(247,250,245,0.96) 0%, rgba(243,246,239,0.92) 100%)",
      "--ember-stage-surface-top": "#f7faf5",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(246,249,242,0.98) 100%)",
      "--ember-card-subtle-border": "rgba(204, 218, 195, 0.72)",
      "--ember-divider-subtle": "rgba(111, 143, 83, 0.16)",
      "--ember-chrome-rail": "#f4f7f1",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #eef4e8 0%, #f4f7f1 100%)",
      "--ember-chrome-surface": "#f6f9f2",
      "--ember-chrome-active-tab": "#fbfdf8",
      "--ember-chrome-tab-hover": "#eef4e8",
      "--ember-chrome-tab-active-surface": "#fbfdf8",
      "--ember-chrome-border": "rgba(204, 218, 195, 0.74)",
      "--ember-chrome-divider": "rgba(204, 218, 195, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(111, 143, 83, 0.026), transparent 42%), radial-gradient(circle at 78% 115%, rgba(188, 216, 208, 0.034), transparent 46%), linear-gradient(180deg, #fbfdf8 0%, #f9fbf6 58%, #f7faf5 100%)",
      "--ember-chrome-stage-seam": "rgba(111, 143, 83, 0.075)",
      "--ember-chrome-text": "#233c31",
      "--ember-chrome-muted": "#667564",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #eef4e8 0%, #f5f8f1 48%, #f9fbf6 100%)",
      "--ember-sidebar-surface-top": "#eef4e8",
      "--ember-sidebar-surface-middle": "#f5f8f1",
      "--ember-sidebar-surface-bottom": "#f9fbf6",
      "--ember-sidebar-border": "rgba(204, 218, 195, 0.72)",
      "--ember-sidebar-divider": "rgba(111, 143, 83, 0.12)",
      "--ember-sidebar-hover": "#e9f1e3",
      "--ember-sidebar-active": "#e1edd9",
      "--ember-sidebar-active-text": "#234f36",
      "--ember-sidebar-search-bg": "#fbfdf8",
      "--ember-sidebar-search-hover": "#eef4e8",
      "--ember-sidebar-search-border-hover": "#c9d8bf",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fbfdf8 0%, #f3f6ef 100%)",
      "--ember-sidebar-card-border": "rgba(204, 218, 195, 0.7)",
      "--ember-sidebar-card-highlight": "rgba(255,255,255,0.56)",
      "--ember-sidebar-card-shadow": "0 14px 28px -26px rgba(15, 23, 42, 0.3)",
      "--ember-sidebar-glow-primary": "rgba(111, 143, 83, 0.032)",
      "--ember-sidebar-glow-secondary": "rgba(47, 111, 70, 0.024)",
      "--ember-sidebar-glow-tertiary": "rgba(188, 216, 208, 0.034)",
      "--ember-home-bg-start": "#f4f7f1",
      "--ember-home-bg-mid": "#f7faf5",
      "--ember-home-bg-end": "#f2f7ef",
      "--ember-home-glow-primary": "rgba(111, 143, 83, 0.032)",
      "--ember-home-glow-secondary": "rgba(188, 216, 208, 0.048)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #233c31 0%, #356b48 100%)",
      "--ember-home-title-shadow": "0 12px 26px rgba(15, 23, 42, 0.04)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #6f8f53, #2f6f46)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(111,143,83,0.045), 0 0 14px rgba(47,111,70,0.08)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(111,143,83,0) 0%, rgba(111,143,83,0.032) 32%, rgba(255,255,255,0.22) 50%, rgba(188,216,208,0.04) 68%, rgba(111,143,83,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,234,0.94) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,246,234,0.94))",
      "--ember-home-card-border": "rgba(204, 218, 195, 0.84)",
      "--ember-home-card-border-muted": "rgba(220, 232, 213, 0.9)",
      "--ember-home-card-hover-border": "#c9d8bf",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #f4f8f1 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #f4f8f1 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #f4f8f1 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #eef6e8 100%)",
      "--ember-composer-border": "rgba(201, 216, 191, 0.68)",
      "--ember-composer-border-focus": "rgba(111, 143, 83, 0.46)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#234f36 0%,#2f6f46 58%,#6f8f53 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#234f36 0%,#2f6f46 100%)",
    }),
  },
  {
    id: "ember-ocean",
    label: "海洋",
    description: "沉静专业的蓝色调。",
    swatches: ["#f3f8fa", "#0f766e", "#2563eb"],
    variables: withPalette({
      "--ember-text": "#173346",
      "--ember-text-muted": "#64748b",
      "--ember-surface-soft": "#f3f8fa",
      "--ember-surface-muted": "#edf5f7",
      "--ember-surface-border": "#d7e6ea",
      "--ember-surface-border-strong": "#bfd6dc",
      "--ember-brand-strong": "#0f766e",
      "--ember-brand": "#14b8a6",
      "--ember-brand-muted": "#5aa9b8",
      "--ember-brand-soft": "#ecfeff",
      "--ember-info": "#2f6f8f",
      "--ember-info-soft": "#eff6ff",
      "--ember-info-border": "#c9dde5",
      "--ember-focus-ring": "rgba(47, 111, 143, 0.16)",
      "--ember-app-bg": "#f2f7f9",
      "--ember-shell-surface":
        "linear-gradient(180deg, #eef6f8 0%, #f8fbfc 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #f8fcfd 0%, #f2f7f9 56%, #f9fcfd 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(248,252,253,0.96) 0%, rgba(242,247,249,0.92) 100%)",
      "--ember-stage-surface-top": "#f8fcfd",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(245,250,251,0.98) 100%)",
      "--ember-card-subtle-border": "rgba(202, 220, 225, 0.72)",
      "--ember-divider-subtle": "rgba(14, 116, 144, 0.14)",
      "--ember-chrome-rail": "#f4f8fa",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #edf5f7 0%, #f4f8fa 100%)",
      "--ember-chrome-surface": "#f7fbfc",
      "--ember-chrome-active-tab": "#fbfdfe",
      "--ember-chrome-tab-hover": "#edf5f7",
      "--ember-chrome-tab-active-surface": "#fbfdfe",
      "--ember-chrome-border": "rgba(202, 220, 225, 0.74)",
      "--ember-chrome-divider": "rgba(202, 220, 225, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(20, 184, 166, 0.024), transparent 42%), radial-gradient(circle at 78% 115%, rgba(59, 130, 246, 0.032), transparent 46%), linear-gradient(180deg, #fbfdfe 0%, #fafdfd 58%, #f8fcfd 100%)",
      "--ember-chrome-stage-seam": "rgba(14, 116, 144, 0.065)",
      "--ember-chrome-text": "#173346",
      "--ember-chrome-muted": "#64748b",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #edf5f7 0%, #f5fafb 48%, #f8fcfd 100%)",
      "--ember-sidebar-surface-top": "#edf5f7",
      "--ember-sidebar-surface-middle": "#f5fafb",
      "--ember-sidebar-surface-bottom": "#f8fcfd",
      "--ember-sidebar-border": "rgba(202, 220, 225, 0.72)",
      "--ember-sidebar-divider": "rgba(14, 116, 144, 0.1)",
      "--ember-sidebar-hover": "#e6f2f5",
      "--ember-sidebar-active": "#dff5f4",
      "--ember-sidebar-active-text": "#0f766e",
      "--ember-sidebar-search-bg": "#fbfdfe",
      "--ember-sidebar-search-hover": "#edf5f7",
      "--ember-sidebar-search-border-hover": "#bfd6dc",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fbfdfe 0%, #f1f7f9 100%)",
      "--ember-sidebar-card-border": "rgba(202, 220, 225, 0.7)",
      "--ember-sidebar-card-highlight": "rgba(255,255,255,0.56)",
      "--ember-sidebar-card-shadow": "0 14px 28px -26px rgba(15, 23, 42, 0.3)",
      "--ember-sidebar-glow-primary": "rgba(14,116,144,0.03)",
      "--ember-sidebar-glow-secondary": "rgba(20,184,166,0.022)",
      "--ember-sidebar-glow-tertiary": "rgba(59,130,246,0.032)",
      "--ember-home-bg-start": "#f3f8fa",
      "--ember-home-bg-mid": "#f8fcfd",
      "--ember-home-bg-end": "#eef7f9",
      "--ember-home-glow-primary": "rgba(20,184,166,0.028)",
      "--ember-home-glow-secondary": "rgba(59,130,246,0.042)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #173346 0%, #0f766e 100%)",
      "--ember-home-title-shadow": "0 12px 26px rgba(15, 23, 42, 0.04)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #5aa9b8, #0f766e)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(20,184,166,0.04), 0 0 14px rgba(47,111,143,0.075)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(20,184,166,0) 0%, rgba(20,184,166,0.032) 32%, rgba(255,255,255,0.22) 50%, rgba(47,111,143,0.04) 68%, rgba(20,184,166,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.94) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(236,254,255,0.94))",
      "--ember-home-card-border": "rgba(201, 221, 229, 0.86)",
      "--ember-home-card-border-muted": "rgba(219, 232, 237, 0.92)",
      "--ember-home-card-hover-border": "#b8d5dd",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #f4f9fb 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #f4f9fb 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #f4f9fb 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #edf7fa 100%)",
      "--ember-composer-border": "rgba(174, 205, 213, 0.7)",
      "--ember-composer-border-focus": "rgba(47, 111, 143, 0.46)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#0f766e 0%,#14b8a6 54%,#2f6f8f 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#0f766e 0%,#2f6f8f 100%)",
    }),
  },
  {
    id: "ember-sand",
    label: "复古",
    description: "温暖怀旧的琥珀色调。",
    swatches: ["#f7f3e8", "#2f4638", "#c9a46a"],
    variables: withPalette({
      "--ember-text": "#2f4638",
      "--ember-text-muted": "#6f7466",
      "--ember-surface": "#fffdf7",
      "--ember-surface-subtle": "#fbfaf4",
      "--ember-surface-soft": "#f7f3e8",
      "--ember-surface-muted": "#f3efe4",
      "--ember-surface-hover": "#f0eadc",
      "--ember-surface-border": "#d8d0bf",
      "--ember-surface-border-strong": "#c9d8bf",
      "--ember-brand-strong": "#233c31",
      "--ember-brand": "#2f6f46",
      "--ember-brand-muted": "#6f8f53",
      "--ember-brand-soft": "#eef4e8",
      "--ember-info": "#4f7664",
      "--ember-info-soft": "#eef4e8",
      "--ember-info-border": "#c9d8bf",
      "--ember-warning": "#7a5523",
      "--ember-warning-soft": "#f8edd5",
      "--ember-warning-border": "#e3c486",
      "--ember-focus-ring": "rgba(151, 123, 77, 0.16)",
      "--ember-app-bg": "#f2eee3",
      "--ember-shell-surface":
        "linear-gradient(180deg, #eee8dc 0%, #faf7ef 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #fbfaf4 0%, #f2eee3 56%, #fffdf7 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(251,250,244,0.96) 0%, rgba(242,238,227,0.92) 100%)",
      "--ember-stage-surface-top": "#fbfaf4",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,253,247,0.94) 0%, rgba(247,243,232,0.98) 100%)",
      "--ember-card-subtle-border": "rgba(216, 208, 191, 0.72)",
      "--ember-divider-subtle": "rgba(84, 104, 76, 0.16)",
      "--ember-chrome-rail": "#f4f0e7",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #eee8dc 0%, #f4f0e7 100%)",
      "--ember-chrome-surface": "#f7f3ea",
      "--ember-chrome-active-tab": "#fbfaf4",
      "--ember-chrome-tab-hover": "#f0eadc",
      "--ember-chrome-tab-active-surface": "#fbfaf4",
      "--ember-chrome-border": "rgba(216, 208, 191, 0.74)",
      "--ember-chrome-divider": "rgba(216, 208, 191, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(112, 126, 83, 0.026), transparent 42%), radial-gradient(circle at 78% 115%, rgba(204, 190, 158, 0.036), transparent 46%), linear-gradient(180deg, #fbfaf4 0%, #fbfaf4 58%, #fbfaf4 100%)",
      "--ember-chrome-stage-seam": "rgba(84, 104, 76, 0.075)",
      "--ember-chrome-text": "#263f32",
      "--ember-chrome-muted": "#687062",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #eee9dd 0%, #f5f1e7 48%, #f8f4ea 100%)",
      "--ember-sidebar-surface-top": "#eee9dd",
      "--ember-sidebar-surface-middle": "#f5f1e7",
      "--ember-sidebar-surface-bottom": "#f8f4ea",
      "--ember-sidebar-border": "rgba(216, 208, 191, 0.74)",
      "--ember-sidebar-divider": "rgba(84,104,76,0.12)",
      "--ember-sidebar-hover": "#f0eadc",
      "--ember-sidebar-active": "#e5efdf",
      "--ember-sidebar-active-text": "#234f36",
      "--ember-sidebar-search-bg": "#fbfaf4",
      "--ember-sidebar-search-hover": "#f2ede2",
      "--ember-sidebar-search-border-hover": "#c9d8bf",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fffdf7 0%, #f4efe2 100%)",
      "--ember-sidebar-card-border": "rgba(216, 208, 191, 0.7)",
      "--ember-sidebar-card-highlight": "rgba(255,253,247,0.58)",
      "--ember-sidebar-card-shadow": "0 14px 28px -26px rgba(15, 23, 42, 0.3)",
      "--ember-sidebar-glow-primary": "rgba(112,126,83,0.03)",
      "--ember-sidebar-glow-secondary": "rgba(72,111,78,0.022)",
      "--ember-sidebar-glow-tertiary": "rgba(204,190,158,0.04)",
      "--ember-home-bg-start": "#f3efe4",
      "--ember-home-bg-mid": "#f7f3e8",
      "--ember-home-bg-end": "#fbfaf4",
      "--ember-home-glow-primary": "rgba(112,126,83,0.032)",
      "--ember-home-glow-secondary": "rgba(204,190,158,0.052)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #233c31 0%, #3b6b4b 100%)",
      "--ember-home-title-shadow": "0 12px 26px rgba(15, 23, 42, 0.04)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #7d8b59, #3b6b4b)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(112,126,83,0.04), 0 0 14px rgba(47,111,70,0.075)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(112,126,83,0) 0%, rgba(112,126,83,0.032) 32%, rgba(255,255,255,0.22) 50%, rgba(204,190,158,0.04) 68%, rgba(112,126,83,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(244,239,226,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,253,247,0.98), rgba(244,239,226,0.94))",
      "--ember-home-card-border": "rgba(216,208,191,0.84)",
      "--ember-home-card-border-muted": "rgba(216,208,191,0.88)",
      "--ember-home-card-hover-border": "#c9d8bf",
      "--ember-composer-surface":
        "linear-gradient(180deg, #fffdf7 0%, #f6f1e6 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #fffdf7 0%, #f6f1e6 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #fffdf7 0%, #f6f1e6 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #fffdf7 0%, #eef4e8 100%)",
      "--ember-composer-border": "rgba(207, 198, 178, 0.72)",
      "--ember-composer-border-focus": "rgba(95, 138, 76, 0.46)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#233c31 0%,#2f6f46 58%,#6f8f53 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#233c31 0%,#2f6f46 100%)",
    }),
  },
  {
    id: "ember-neon",
    label: "霓虹",
    description: "赛博明亮的粉紫色调。",
    swatches: ["#fdf4ff", "#b026c6", "#22c55e"],
    variables: withPalette({
      "--ember-text": "#2f1b45",
      "--ember-text-muted": "#7c6a8a",
      "--ember-surface": "#fffaff",
      "--ember-surface-subtle": "#fef7ff",
      "--ember-surface-soft": "#fbf0ff",
      "--ember-surface-muted": "#f5e7fb",
      "--ember-surface-hover": "#f0ddfb",
      "--ember-surface-border": "#ead2f5",
      "--ember-surface-border-strong": "#dbb5eb",
      "--ember-brand-strong": "#86198f",
      "--ember-brand": "#c026d3",
      "--ember-brand-muted": "#22c55e",
      "--ember-brand-soft": "#fae8ff",
      "--ember-info": "#0e7490",
      "--ember-info-soft": "#ecfeff",
      "--ember-info-border": "#bae6fd",
      "--ember-focus-ring": "rgba(192, 38, 211, 0.16)",
      "--ember-app-bg": "#f8f2fb",
      "--ember-shell-surface":
        "linear-gradient(180deg, #f4e8fb 0%, #fffaff 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #fffaff 0%, #f8f2fb 56%, #fdf8ff 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,250,255,0.96) 0%, rgba(248,242,251,0.92) 100%)",
      "--ember-stage-surface-top": "#fffaff",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,240,255,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(234, 210, 245, 0.76)",
      "--ember-divider-subtle": "rgba(134, 25, 143, 0.14)",
      "--ember-chrome-rail": "#fbf0ff",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #f4e8fb 0%, #fbf0ff 100%)",
      "--ember-chrome-surface": "#fef7ff",
      "--ember-chrome-active-tab": "#fffaff",
      "--ember-chrome-tab-hover": "#f0ddfb",
      "--ember-chrome-tab-active-surface": "#fffaff",
      "--ember-chrome-border": "rgba(234, 210, 245, 0.76)",
      "--ember-chrome-divider": "rgba(234, 210, 245, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(192, 38, 211, 0.034), transparent 42%), radial-gradient(circle at 78% 115%, rgba(34, 197, 94, 0.04), transparent 46%), linear-gradient(180deg, #fffaff 0%, #fdf8ff 58%, #fffaff 100%)",
      "--ember-chrome-stage-seam": "rgba(134, 25, 143, 0.07)",
      "--ember-chrome-text": "#2f1b45",
      "--ember-chrome-muted": "#7c6a8a",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #f4e8fb 0%, #fbf4ff 48%, #fffaff 100%)",
      "--ember-sidebar-surface-top": "#f4e8fb",
      "--ember-sidebar-surface-middle": "#fbf4ff",
      "--ember-sidebar-surface-bottom": "#fffaff",
      "--ember-sidebar-border": "rgba(234, 210, 245, 0.72)",
      "--ember-sidebar-divider": "rgba(134,25,143,0.12)",
      "--ember-sidebar-hover": "#f0ddfb",
      "--ember-sidebar-active": "#fae8ff",
      "--ember-sidebar-active-text": "#86198f",
      "--ember-sidebar-search-bg": "#fffaff",
      "--ember-sidebar-search-hover": "#f5e7fb",
      "--ember-sidebar-search-border-hover": "#dbb5eb",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fffaff 0%, #f5e7fb 100%)",
      "--ember-sidebar-card-border": "rgba(234, 210, 245, 0.7)",
      "--ember-home-bg-start": "#fbf0ff",
      "--ember-home-bg-mid": "#fffaff",
      "--ember-home-bg-end": "#f4fbf7",
      "--ember-home-glow-primary": "rgba(192,38,211,0.04)",
      "--ember-home-glow-secondary": "rgba(34,197,94,0.05)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #2f1b45 0%, #a21caf 54%, #15803d 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #d946ef, #22c55e)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(192,38,211,0.045), 0 0 14px rgba(34,197,94,0.08)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(192,38,211,0) 0%, rgba(192,38,211,0.034) 32%, rgba(255,255,255,0.26) 50%, rgba(34,197,94,0.045) 68%, rgba(192,38,211,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,232,255,0.9) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(236,254,255,0.92))",
      "--ember-home-card-border": "rgba(234,210,245,0.86)",
      "--ember-home-card-border-muted": "rgba(234,210,245,0.84)",
      "--ember-home-card-hover-border": "#dbb5eb",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #fbf0ff 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #fbf0ff 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #fbf0ff 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #f5e7fb 100%)",
      "--ember-composer-border": "rgba(219, 181, 235, 0.7)",
      "--ember-composer-border-focus": "rgba(192, 38, 211, 0.44)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#86198f 0%,#c026d3 54%,#22c55e 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#86198f 0%,#c026d3 100%)",
    }),
  },
  {
    id: "ember-citron",
    label: "柠黄",
    description: "活力清新的黄绿配紫。",
    swatches: ["#fbffe8", "#84cc16", "#6d4fb3"],
    variables: withPalette({
      "--ember-text": "#25351a",
      "--ember-text-muted": "#69735b",
      "--ember-surface": "#fffffb",
      "--ember-surface-subtle": "#fbffe8",
      "--ember-surface-soft": "#f4ffd2",
      "--ember-surface-muted": "#ecf7bf",
      "--ember-surface-hover": "#e3f2a8",
      "--ember-surface-border": "#d9e9a5",
      "--ember-surface-border-strong": "#c4d77d",
      "--ember-brand-strong": "#4d7c0f",
      "--ember-brand": "#84cc16",
      "--ember-brand-muted": "#6d4fb3",
      "--ember-brand-soft": "#f7fee7",
      "--ember-info": "#6d4fb3",
      "--ember-info-soft": "#f5f3ff",
      "--ember-info-border": "#ddd6fe",
      "--ember-focus-ring": "rgba(132, 204, 22, 0.18)",
      "--ember-app-bg": "#f5f8e9",
      "--ember-shell-surface":
        "linear-gradient(180deg, #edf7c7 0%, #fffffb 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #fffffb 0%, #f5f8e9 56%, #fbffe8 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,255,251,0.96) 0%, rgba(245,248,233,0.92) 100%)",
      "--ember-stage-surface-top": "#fffffb",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,254,231,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(217, 233, 165, 0.76)",
      "--ember-divider-subtle": "rgba(77, 124, 15, 0.14)",
      "--ember-chrome-rail": "#f4ffd2",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #edf7c7 0%, #f4ffd2 100%)",
      "--ember-chrome-surface": "#fbffe8",
      "--ember-chrome-active-tab": "#fffffb",
      "--ember-chrome-tab-hover": "#ecf7bf",
      "--ember-chrome-tab-active-surface": "#fffffb",
      "--ember-chrome-border": "rgba(217, 233, 165, 0.76)",
      "--ember-chrome-divider": "rgba(217, 233, 165, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(132, 204, 22, 0.035), transparent 42%), radial-gradient(circle at 78% 115%, rgba(109, 79, 179, 0.038), transparent 46%), linear-gradient(180deg, #fffffb 0%, #fbffe8 58%, #fffffb 100%)",
      "--ember-chrome-stage-seam": "rgba(77, 124, 15, 0.07)",
      "--ember-chrome-text": "#25351a",
      "--ember-chrome-muted": "#69735b",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #edf7c7 0%, #f8fbdc 48%, #fffffb 100%)",
      "--ember-sidebar-surface-top": "#edf7c7",
      "--ember-sidebar-surface-middle": "#f8fbdc",
      "--ember-sidebar-surface-bottom": "#fffffb",
      "--ember-sidebar-border": "rgba(217, 233, 165, 0.72)",
      "--ember-sidebar-divider": "rgba(77,124,15,0.12)",
      "--ember-sidebar-hover": "#ecf7bf",
      "--ember-sidebar-active": "#e3f2a8",
      "--ember-sidebar-active-text": "#4d7c0f",
      "--ember-sidebar-search-bg": "#fffffb",
      "--ember-sidebar-search-hover": "#f4ffd2",
      "--ember-sidebar-search-border-hover": "#c4d77d",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fffffb 0%, #ecf7bf 100%)",
      "--ember-sidebar-card-border": "rgba(217, 233, 165, 0.7)",
      "--ember-home-bg-start": "#f4ffd2",
      "--ember-home-bg-mid": "#fffffb",
      "--ember-home-bg-end": "#f5f3ff",
      "--ember-home-glow-primary": "rgba(132,204,22,0.045)",
      "--ember-home-glow-secondary": "rgba(109,79,179,0.045)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #25351a 0%, #4d7c0f 54%, #6d4fb3 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #84cc16, #6d4fb3)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(132,204,22,0.05), 0 0 14px rgba(109,79,179,0.075)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(132,204,22,0) 0%, rgba(132,204,22,0.038) 32%, rgba(255,255,255,0.24) 50%, rgba(109,79,179,0.042) 68%, rgba(132,204,22,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,254,231,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,243,255,0.92))",
      "--ember-home-card-border": "rgba(217,233,165,0.86)",
      "--ember-home-card-border-muted": "rgba(217,233,165,0.84)",
      "--ember-home-card-hover-border": "#c4d77d",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #f4ffd2 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #f4ffd2 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #f4ffd2 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #ecf7bf 100%)",
      "--ember-composer-border": "rgba(196, 215, 125, 0.7)",
      "--ember-composer-border-focus": "rgba(132, 204, 22, 0.46)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#4d7c0f 0%,#84cc16 54%,#6d4fb3 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#4d7c0f 0%,#84cc16 100%)",
    }),
  },
  {
    id: "ember-dusk",
    label: "黄昏",
    description: "柔和温暖的暮色调。",
    swatches: ["#fbf4e5", "#7c7f32", "#c1784a"],
    variables: withPalette({
      "--ember-text": "#3f3529",
      "--ember-text-muted": "#7a6f61",
      "--ember-surface": "#fffaf2",
      "--ember-surface-subtle": "#fbf4e5",
      "--ember-surface-soft": "#f7ead7",
      "--ember-surface-muted": "#efdfc8",
      "--ember-surface-hover": "#ead4ba",
      "--ember-surface-border": "#dcc8aa",
      "--ember-surface-border-strong": "#c9ad83",
      "--ember-brand-strong": "#65691f",
      "--ember-brand": "#7c7f32",
      "--ember-brand-muted": "#c1784a",
      "--ember-brand-soft": "#f7f3dd",
      "--ember-info": "#8a5a44",
      "--ember-info-soft": "#fff7ed",
      "--ember-info-border": "#fed7aa",
      "--ember-warning": "#9a5a1f",
      "--ember-warning-soft": "#fff7ed",
      "--ember-warning-border": "#fed7aa",
      "--ember-focus-ring": "rgba(124, 127, 50, 0.16)",
      "--ember-app-bg": "#f3eadc",
      "--ember-shell-surface":
        "linear-gradient(180deg, #eadfce 0%, #fffaf2 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #fffaf2 0%, #f3eadc 56%, #fbf4e5 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,250,242,0.96) 0%, rgba(243,234,220,0.92) 100%)",
      "--ember-stage-surface-top": "#fffaf2",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,250,242,0.96) 0%, rgba(247,234,215,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(220, 200, 170, 0.76)",
      "--ember-divider-subtle": "rgba(124, 127, 50, 0.14)",
      "--ember-chrome-rail": "#f7ead7",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #eadfce 0%, #f7ead7 100%)",
      "--ember-chrome-surface": "#fbf4e5",
      "--ember-chrome-active-tab": "#fffaf2",
      "--ember-chrome-tab-hover": "#efdfc8",
      "--ember-chrome-tab-active-surface": "#fffaf2",
      "--ember-chrome-border": "rgba(220, 200, 170, 0.76)",
      "--ember-chrome-divider": "rgba(220, 200, 170, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(124, 127, 50, 0.03), transparent 42%), radial-gradient(circle at 78% 115%, rgba(193, 120, 74, 0.038), transparent 46%), linear-gradient(180deg, #fffaf2 0%, #fbf4e5 58%, #fffaf2 100%)",
      "--ember-chrome-stage-seam": "rgba(124, 127, 50, 0.07)",
      "--ember-chrome-text": "#3f3529",
      "--ember-chrome-muted": "#7a6f61",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #eadfce 0%, #f6ecdc 48%, #fffaf2 100%)",
      "--ember-sidebar-surface-top": "#eadfce",
      "--ember-sidebar-surface-middle": "#f6ecdc",
      "--ember-sidebar-surface-bottom": "#fffaf2",
      "--ember-sidebar-border": "rgba(220, 200, 170, 0.72)",
      "--ember-sidebar-divider": "rgba(124,127,50,0.12)",
      "--ember-sidebar-hover": "#efdfc8",
      "--ember-sidebar-active": "#f0e8c3",
      "--ember-sidebar-active-text": "#65691f",
      "--ember-sidebar-search-bg": "#fffaf2",
      "--ember-sidebar-search-hover": "#f7ead7",
      "--ember-sidebar-search-border-hover": "#c9ad83",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fffaf2 0%, #efdfc8 100%)",
      "--ember-sidebar-card-border": "rgba(220, 200, 170, 0.7)",
      "--ember-home-bg-start": "#f7ead7",
      "--ember-home-bg-mid": "#fffaf2",
      "--ember-home-bg-end": "#f7f3dd",
      "--ember-home-glow-primary": "rgba(124,127,50,0.04)",
      "--ember-home-glow-secondary": "rgba(193,120,74,0.05)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #3f3529 0%, #65691f 52%, #9a5a1f 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #7c7f32, #c1784a)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(124,127,50,0.045), 0 0 14px rgba(193,120,74,0.08)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(124,127,50,0) 0%, rgba(124,127,50,0.034) 32%, rgba(255,255,255,0.24) 50%, rgba(193,120,74,0.044) 68%, rgba(124,127,50,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,250,242,0.98) 0%, rgba(247,234,215,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,250,242,0.98), rgba(247,243,221,0.92))",
      "--ember-home-card-border": "rgba(220,200,170,0.86)",
      "--ember-home-card-border-muted": "rgba(220,200,170,0.84)",
      "--ember-home-card-hover-border": "#c9ad83",
      "--ember-composer-surface":
        "linear-gradient(180deg, #fffaf2 0%, #f7ead7 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #fffaf2 0%, #f7ead7 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #fffaf2 0%, #f7ead7 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #fffaf2 0%, #efdfc8 100%)",
      "--ember-composer-border": "rgba(201, 173, 131, 0.72)",
      "--ember-composer-border-focus": "rgba(124, 127, 50, 0.44)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#65691f 0%,#7c7f32 54%,#c1784a 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#65691f 0%,#7c7f32 100%)",
    }),
  },
  {
    id: "ember-minimal",
    label: "极简",
    description: "清晰专业的深蓝商务风。",
    swatches: ["#f8fafc", "#334155", "#2563eb"],
    variables: withPalette({
      "--ember-text": "#1e293b",
      "--ember-text-muted": "#64748b",
      "--ember-surface": "#ffffff",
      "--ember-surface-subtle": "#f8fafc",
      "--ember-surface-soft": "#f1f5f9",
      "--ember-surface-muted": "#e2e8f0",
      "--ember-surface-hover": "#eef2f7",
      "--ember-surface-border": "#d8e0ea",
      "--ember-surface-border-strong": "#cbd5e1",
      "--ember-brand-strong": "#334155",
      "--ember-brand": "#2563eb",
      "--ember-brand-muted": "#0f766e",
      "--ember-brand-soft": "#eff6ff",
      "--ember-info": "#0369a1",
      "--ember-info-soft": "#f0f9ff",
      "--ember-info-border": "#bae6fd",
      "--ember-focus-ring": "rgba(37, 99, 235, 0.16)",
      "--ember-app-bg": "#f3f6fa",
      "--ember-shell-surface":
        "linear-gradient(180deg, #eef2f7 0%, #ffffff 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #ffffff 0%, #f3f6fa 56%, #f8fafc 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(243,246,250,0.92) 100%)",
      "--ember-stage-surface-top": "#ffffff",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)",
      "--ember-card-subtle-border": "rgba(216, 224, 234, 0.8)",
      "--ember-divider-subtle": "rgba(51, 65, 85, 0.12)",
      "--ember-chrome-rail": "#f1f5f9",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #eef2f7 0%, #f1f5f9 100%)",
      "--ember-chrome-surface": "#f8fafc",
      "--ember-chrome-active-tab": "#ffffff",
      "--ember-chrome-tab-hover": "#e2e8f0",
      "--ember-chrome-tab-active-surface": "#ffffff",
      "--ember-chrome-border": "rgba(216, 224, 234, 0.78)",
      "--ember-chrome-divider": "rgba(216, 224, 234, 0.68)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(37, 99, 235, 0.026), transparent 42%), radial-gradient(circle at 78% 115%, rgba(15, 118, 110, 0.028), transparent 46%), linear-gradient(180deg, #ffffff 0%, #f8fafc 58%, #ffffff 100%)",
      "--ember-chrome-stage-seam": "rgba(51, 65, 85, 0.065)",
      "--ember-chrome-text": "#1e293b",
      "--ember-chrome-muted": "#64748b",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #eef2f7 0%, #f8fafc 48%, #ffffff 100%)",
      "--ember-sidebar-surface-top": "#eef2f7",
      "--ember-sidebar-surface-middle": "#f8fafc",
      "--ember-sidebar-surface-bottom": "#ffffff",
      "--ember-sidebar-border": "rgba(216, 224, 234, 0.72)",
      "--ember-sidebar-divider": "rgba(51,65,85,0.1)",
      "--ember-sidebar-hover": "#e2e8f0",
      "--ember-sidebar-active": "#eaf2ff",
      "--ember-sidebar-active-text": "#1d4ed8",
      "--ember-sidebar-search-bg": "#ffffff",
      "--ember-sidebar-search-hover": "#f1f5f9",
      "--ember-sidebar-search-border-hover": "#cbd5e1",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #ffffff 0%, #eef2f7 100%)",
      "--ember-sidebar-card-border": "rgba(216, 224, 234, 0.72)",
      "--ember-home-bg-start": "#f1f5f9",
      "--ember-home-bg-mid": "#ffffff",
      "--ember-home-bg-end": "#eff6ff",
      "--ember-home-glow-primary": "rgba(37,99,235,0.032)",
      "--ember-home-glow-secondary": "rgba(15,118,110,0.032)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #1e293b 0%, #334155 54%, #2563eb 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #334155, #2563eb)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(37,99,235,0.04), 0 0 14px rgba(51,65,85,0.07)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(37,99,235,0) 0%, rgba(37,99,235,0.032) 32%, rgba(255,255,255,0.24) 50%, rgba(15,118,110,0.032) 68%, rgba(37,99,235,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,246,255,0.92))",
      "--ember-home-card-border": "rgba(216,224,234,0.88)",
      "--ember-home-card-border-muted": "rgba(216,224,234,0.86)",
      "--ember-home-card-hover-border": "#cbd5e1",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)",
      "--ember-composer-border": "rgba(203, 213, 225, 0.74)",
      "--ember-composer-border-focus": "rgba(37, 99, 235, 0.44)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#334155 0%,#2563eb 58%,#0f766e 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#334155 0%,#2563eb 100%)",
    }),
  },
  {
    id: "ember-vivid",
    label: "活力",
    description: "时尚有冲击力的现代科技风。",
    swatches: ["#f0fdfa", "#14b8a6", "#f97316"],
    variables: withPalette({
      "--ember-text": "#143d3a",
      "--ember-text-muted": "#607874",
      "--ember-surface": "#ffffff",
      "--ember-surface-subtle": "#f0fdfa",
      "--ember-surface-soft": "#e8fbf7",
      "--ember-surface-muted": "#d7f3ed",
      "--ember-surface-hover": "#c8eee7",
      "--ember-surface-border": "#bde7df",
      "--ember-surface-border-strong": "#98d7cd",
      "--ember-brand-strong": "#0f766e",
      "--ember-brand": "#14b8a6",
      "--ember-brand-muted": "#f97316",
      "--ember-brand-soft": "#ccfbf1",
      "--ember-info": "#0ea5e9",
      "--ember-info-soft": "#f0f9ff",
      "--ember-info-border": "#bae6fd",
      "--ember-warning": "#c2410c",
      "--ember-warning-soft": "#fff7ed",
      "--ember-warning-border": "#fed7aa",
      "--ember-focus-ring": "rgba(20, 184, 166, 0.18)",
      "--ember-app-bg": "#eef9f7",
      "--ember-shell-surface":
        "linear-gradient(180deg, #dff7f1 0%, #ffffff 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #ffffff 0%, #eef9f7 56%, #f0fdfa 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(238,249,247,0.92) 100%)",
      "--ember-stage-surface-top": "#ffffff",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(189, 231, 223, 0.78)",
      "--ember-divider-subtle": "rgba(15, 118, 110, 0.13)",
      "--ember-chrome-rail": "#e8fbf7",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #dff7f1 0%, #e8fbf7 100%)",
      "--ember-chrome-surface": "#f0fdfa",
      "--ember-chrome-active-tab": "#ffffff",
      "--ember-chrome-tab-hover": "#d7f3ed",
      "--ember-chrome-tab-active-surface": "#ffffff",
      "--ember-chrome-border": "rgba(189, 231, 223, 0.78)",
      "--ember-chrome-divider": "rgba(189, 231, 223, 0.66)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(20, 184, 166, 0.034), transparent 42%), radial-gradient(circle at 78% 115%, rgba(249, 115, 22, 0.036), transparent 46%), linear-gradient(180deg, #ffffff 0%, #f0fdfa 58%, #ffffff 100%)",
      "--ember-chrome-stage-seam": "rgba(15, 118, 110, 0.07)",
      "--ember-chrome-text": "#143d3a",
      "--ember-chrome-muted": "#607874",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #dff7f1 0%, #f0fdfa 48%, #ffffff 100%)",
      "--ember-sidebar-surface-top": "#dff7f1",
      "--ember-sidebar-surface-middle": "#f0fdfa",
      "--ember-sidebar-surface-bottom": "#ffffff",
      "--ember-sidebar-border": "rgba(189, 231, 223, 0.72)",
      "--ember-sidebar-divider": "rgba(15,118,110,0.11)",
      "--ember-sidebar-hover": "#d7f3ed",
      "--ember-sidebar-active": "#ccfbf1",
      "--ember-sidebar-active-text": "#0f766e",
      "--ember-sidebar-search-bg": "#ffffff",
      "--ember-sidebar-search-hover": "#e8fbf7",
      "--ember-sidebar-search-border-hover": "#98d7cd",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #ffffff 0%, #d7f3ed 100%)",
      "--ember-sidebar-card-border": "rgba(189, 231, 223, 0.7)",
      "--ember-home-bg-start": "#e8fbf7",
      "--ember-home-bg-mid": "#ffffff",
      "--ember-home-bg-end": "#fff7ed",
      "--ember-home-glow-primary": "rgba(20,184,166,0.045)",
      "--ember-home-glow-secondary": "rgba(249,115,22,0.048)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #143d3a 0%, #0f766e 54%, #c2410c 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #14b8a6, #f97316)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(20,184,166,0.045), 0 0 14px rgba(249,115,22,0.08)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(20,184,166,0) 0%, rgba(20,184,166,0.036) 32%, rgba(255,255,255,0.24) 50%, rgba(249,115,22,0.042) 68%, rgba(20,184,166,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,250,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,237,0.92))",
      "--ember-home-card-border": "rgba(189,231,223,0.88)",
      "--ember-home-card-border-muted": "rgba(189,231,223,0.84)",
      "--ember-home-card-hover-border": "#98d7cd",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #e8fbf7 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #e8fbf7 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #e8fbf7 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #d7f3ed 100%)",
      "--ember-composer-border": "rgba(152, 215, 205, 0.72)",
      "--ember-composer-border-focus": "rgba(20, 184, 166, 0.46)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#0f766e 0%,#14b8a6 54%,#f97316 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#0f766e 0%,#14b8a6 100%)",
    }),
  },
  {
    id: "ember-literary",
    label: "文艺",
    description: "宁静高雅的灰蓝文艺风。",
    swatches: ["#f5f7fb", "#53627a", "#8b7ab8"],
    variables: withPalette({
      "--ember-text": "#283244",
      "--ember-text-muted": "#6b7280",
      "--ember-surface": "#ffffff",
      "--ember-surface-subtle": "#f8fafc",
      "--ember-surface-soft": "#f2f5f9",
      "--ember-surface-muted": "#e8edf4",
      "--ember-surface-hover": "#e1e8f1",
      "--ember-surface-border": "#d7e0eb",
      "--ember-surface-border-strong": "#c3cedc",
      "--ember-brand-strong": "#475569",
      "--ember-brand": "#64748b",
      "--ember-brand-muted": "#8b7ab8",
      "--ember-brand-soft": "#f1f5f9",
      "--ember-info": "#66738f",
      "--ember-info-soft": "#eef2ff",
      "--ember-info-border": "#c7d2fe",
      "--ember-focus-ring": "rgba(100, 116, 139, 0.16)",
      "--ember-app-bg": "#f1f4f8",
      "--ember-shell-surface":
        "linear-gradient(180deg, #e8edf4 0%, #ffffff 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #ffffff 0%, #f1f4f8 56%, #f8fafc 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,244,248,0.92) 100%)",
      "--ember-stage-surface-top": "#ffffff",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,245,249,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(215, 224, 235, 0.78)",
      "--ember-divider-subtle": "rgba(71, 85, 105, 0.12)",
      "--ember-chrome-rail": "#f2f5f9",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #e8edf4 0%, #f2f5f9 100%)",
      "--ember-chrome-surface": "#f8fafc",
      "--ember-chrome-active-tab": "#ffffff",
      "--ember-chrome-tab-hover": "#e8edf4",
      "--ember-chrome-tab-active-surface": "#ffffff",
      "--ember-chrome-border": "rgba(215, 224, 235, 0.78)",
      "--ember-chrome-divider": "rgba(215, 224, 235, 0.68)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(100, 116, 139, 0.026), transparent 42%), radial-gradient(circle at 78% 115%, rgba(139, 122, 184, 0.034), transparent 46%), linear-gradient(180deg, #ffffff 0%, #f8fafc 58%, #ffffff 100%)",
      "--ember-chrome-stage-seam": "rgba(71, 85, 105, 0.065)",
      "--ember-chrome-text": "#283244",
      "--ember-chrome-muted": "#6b7280",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #e8edf4 0%, #f5f7fb 48%, #ffffff 100%)",
      "--ember-sidebar-surface-top": "#e8edf4",
      "--ember-sidebar-surface-middle": "#f5f7fb",
      "--ember-sidebar-surface-bottom": "#ffffff",
      "--ember-sidebar-border": "rgba(215, 224, 235, 0.72)",
      "--ember-sidebar-divider": "rgba(71,85,105,0.1)",
      "--ember-sidebar-hover": "#e8edf4",
      "--ember-sidebar-active": "#eef2ff",
      "--ember-sidebar-active-text": "#475569",
      "--ember-sidebar-search-bg": "#ffffff",
      "--ember-sidebar-search-hover": "#f2f5f9",
      "--ember-sidebar-search-border-hover": "#c3cedc",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #ffffff 0%, #e8edf4 100%)",
      "--ember-sidebar-card-border": "rgba(215, 224, 235, 0.7)",
      "--ember-home-bg-start": "#f2f5f9",
      "--ember-home-bg-mid": "#ffffff",
      "--ember-home-bg-end": "#eef2ff",
      "--ember-home-glow-primary": "rgba(100,116,139,0.032)",
      "--ember-home-glow-secondary": "rgba(139,122,184,0.04)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #283244 0%, #53627a 54%, #8b7ab8 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #53627a, #8b7ab8)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(100,116,139,0.04), 0 0 14px rgba(139,122,184,0.075)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(100,116,139,0) 0%, rgba(100,116,139,0.03) 32%, rgba(255,255,255,0.24) 50%, rgba(139,122,184,0.038) 68%, rgba(100,116,139,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,245,249,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(238,242,255,0.92))",
      "--ember-home-card-border": "rgba(215,224,235,0.88)",
      "--ember-home-card-border-muted": "rgba(215,224,235,0.84)",
      "--ember-home-card-hover-border": "#c3cedc",
      "--ember-composer-surface":
        "linear-gradient(180deg, #ffffff 0%, #f2f5f9 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #ffffff 0%, #f2f5f9 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #ffffff 0%, #f2f5f9 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)",
      "--ember-composer-border": "rgba(195, 206, 220, 0.72)",
      "--ember-composer-border-focus": "rgba(100, 116, 139, 0.44)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#475569 0%,#64748b 54%,#8b7ab8 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#475569 0%,#64748b 100%)",
    }),
  },
  {
    id: "ember-luxury",
    label: "奢华",
    description: "尊贵权威的黑金商务风。",
    swatches: ["#fbf8ef", "#1f2933", "#c9a23a"],
    variables: withPalette({
      "--ember-text": "#2c2a24",
      "--ember-text-muted": "#746f62",
      "--ember-surface": "#fffdf7",
      "--ember-surface-subtle": "#fbf8ef",
      "--ember-surface-soft": "#f4efe2",
      "--ember-surface-muted": "#ebe2cf",
      "--ember-surface-hover": "#e6dac2",
      "--ember-surface-border": "#d8cab0",
      "--ember-surface-border-strong": "#c9a23a",
      "--ember-brand-strong": "#1f2933",
      "--ember-brand": "#9d7a22",
      "--ember-brand-muted": "#c9a23a",
      "--ember-brand-soft": "#f8edd0",
      "--ember-info": "#58606a",
      "--ember-info-soft": "#f4f6f8",
      "--ember-info-border": "#d8dee6",
      "--ember-warning": "#8a5a10",
      "--ember-warning-soft": "#fff7e6",
      "--ember-warning-border": "#f3d28d",
      "--ember-focus-ring": "rgba(157, 122, 34, 0.16)",
      "--ember-app-bg": "#f1eadc",
      "--ember-shell-surface":
        "linear-gradient(180deg, #e8dec9 0%, #fffdf7 100%)",
      "--ember-stage-surface":
        "linear-gradient(180deg, #fffdf7 0%, #f1eadc 56%, #fbf8ef 100%)",
      "--ember-stage-surface-soft":
        "linear-gradient(180deg, rgba(255,253,247,0.96) 0%, rgba(241,234,220,0.92) 100%)",
      "--ember-stage-surface-top": "#fffdf7",
      "--ember-card-subtle":
        "linear-gradient(180deg, rgba(255,253,247,0.96) 0%, rgba(244,239,226,0.94) 100%)",
      "--ember-card-subtle-border": "rgba(216, 202, 176, 0.78)",
      "--ember-divider-subtle": "rgba(31, 41, 51, 0.12)",
      "--ember-chrome-rail": "#f4efe2",
      "--ember-chrome-rail-surface":
        "linear-gradient(180deg, #e8dec9 0%, #f4efe2 100%)",
      "--ember-chrome-surface": "#fbf8ef",
      "--ember-chrome-active-tab": "#fffdf7",
      "--ember-chrome-tab-hover": "#ebe2cf",
      "--ember-chrome-tab-active-surface": "#fffdf7",
      "--ember-chrome-border": "rgba(216, 202, 176, 0.78)",
      "--ember-chrome-divider": "rgba(216, 202, 176, 0.68)",
      "--ember-chrome-stage-blend":
        "radial-gradient(circle at 18% 100%, rgba(31, 41, 51, 0.026), transparent 42%), radial-gradient(circle at 78% 115%, rgba(201, 162, 58, 0.04), transparent 46%), linear-gradient(180deg, #fffdf7 0%, #fbf8ef 58%, #fffdf7 100%)",
      "--ember-chrome-stage-seam": "rgba(31, 41, 51, 0.07)",
      "--ember-chrome-text": "#2c2a24",
      "--ember-chrome-muted": "#746f62",
      "--ember-sidebar-surface":
        "linear-gradient(180deg, #e8dec9 0%, #f6f0e4 48%, #fffdf7 100%)",
      "--ember-sidebar-surface-top": "#e8dec9",
      "--ember-sidebar-surface-middle": "#f6f0e4",
      "--ember-sidebar-surface-bottom": "#fffdf7",
      "--ember-sidebar-border": "rgba(216, 202, 176, 0.72)",
      "--ember-sidebar-divider": "rgba(31,41,51,0.1)",
      "--ember-sidebar-hover": "#ebe2cf",
      "--ember-sidebar-active": "#f8edd0",
      "--ember-sidebar-active-text": "#1f2933",
      "--ember-sidebar-search-bg": "#fffdf7",
      "--ember-sidebar-search-hover": "#f4efe2",
      "--ember-sidebar-search-border-hover": "#c9a23a",
      "--ember-sidebar-card-surface":
        "linear-gradient(180deg, #fffdf7 0%, #ebe2cf 100%)",
      "--ember-sidebar-card-border": "rgba(216, 202, 176, 0.7)",
      "--ember-home-bg-start": "#f4efe2",
      "--ember-home-bg-mid": "#fffdf7",
      "--ember-home-bg-end": "#f8edd0",
      "--ember-home-glow-primary": "rgba(31,41,51,0.032)",
      "--ember-home-glow-secondary": "rgba(201,162,58,0.048)",
      "--ember-home-title-gradient":
        "linear-gradient(90deg, #1f2933 0%, #2c2a24 52%, #9d7a22 100%)",
      "--ember-home-dot-gradient": "linear-gradient(135deg, #1f2933, #c9a23a)",
      "--ember-home-dot-shadow":
        "0 0 0 8px rgba(31,41,51,0.038), 0 0 14px rgba(201,162,58,0.08)",
      "--ember-home-beam-gradient":
        "linear-gradient(90deg, rgba(31,41,51,0) 0%, rgba(31,41,51,0.03) 32%, rgba(255,255,255,0.24) 50%, rgba(201,162,58,0.044) 68%, rgba(31,41,51,0) 100%)",
      "--ember-home-card-surface":
        "linear-gradient(180deg, rgba(255,253,247,0.98) 0%, rgba(244,239,226,0.92) 100%)",
      "--ember-home-card-surface-strong":
        "linear-gradient(180deg, rgba(255,253,247,0.98), rgba(248,237,208,0.92))",
      "--ember-home-card-border": "rgba(216,202,176,0.88)",
      "--ember-home-card-border-muted": "rgba(216,202,176,0.84)",
      "--ember-home-card-hover-border": "#c9a23a",
      "--ember-composer-surface":
        "linear-gradient(180deg, #fffdf7 0%, #f4efe2 100%)",
      "--ember-composer-shell":
        "linear-gradient(180deg, #fffdf7 0%, #f4efe2 100%)",
      "--ember-composer-surface-floating":
        "linear-gradient(180deg, #fffdf7 0%, #f4efe2 100%)",
      "--ember-composer-surface-focus":
        "linear-gradient(180deg, #fffdf7 0%, #f8edd0 100%)",
      "--ember-composer-border": "rgba(201, 162, 58, 0.48)",
      "--ember-composer-border-focus": "rgba(157, 122, 34, 0.44)",
      "--ember-primary-gradient":
        "linear-gradient(135deg,#1f2933 0%,#2c2a24 54%,#c9a23a 100%)",
      "--ember-primary-gradient-simple":
        "linear-gradient(135deg,#1f2933 0%,#9d7a22 100%)",
    }),
  },
];

const LEGACY_COLOR_SCHEME_STORAGE_KEY = "ember.appearance.color-scheme";

function migrateLegacyColorSchemeId(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return value.startsWith("ember-")
    ? value.replace(/^ember-/, "ember-")
    : value;
}

const colorSchemeIds = new Set<EmberColorSchemeId>(
  EMBER_COLOR_SCHEMES.map((scheme) => scheme.id),
);

export function resolveEmberColorSchemeId(
  value: string | null | undefined,
): EmberColorSchemeId {
  const migrated = migrateLegacyColorSchemeId(value);
  return colorSchemeIds.has(migrated as EmberColorSchemeId)
    ? (migrated as EmberColorSchemeId)
    : DEFAULT_EMBER_COLOR_SCHEME_ID;
}

export function getEmberColorScheme(
  id: string | null | undefined,
): EmberColorScheme {
  const resolvedId = resolveEmberColorSchemeId(id);
  return (
    EMBER_COLOR_SCHEMES.find((scheme) => scheme.id === resolvedId) ??
    EMBER_COLOR_SCHEMES[0]
  );
}

export function loadEmberColorSchemeId(): EmberColorSchemeId {
  if (typeof window === "undefined") {
    return DEFAULT_EMBER_COLOR_SCHEME_ID;
  }

  const stored = window.localStorage.getItem(EMBER_COLOR_SCHEME_STORAGE_KEY);
  if (!stored) {
    const legacy = window.localStorage.getItem(LEGACY_COLOR_SCHEME_STORAGE_KEY);
    const migrated = migrateLegacyColorSchemeId(legacy);
    if (migrated) {
      window.localStorage.setItem(EMBER_COLOR_SCHEME_STORAGE_KEY, migrated);
      window.localStorage.removeItem(LEGACY_COLOR_SCHEME_STORAGE_KEY);
      return resolveEmberColorSchemeId(migrated);
    }
  }

  return resolveEmberColorSchemeId(stored);
}

export function applyEmberColorScheme(
  id: string | null | undefined,
  options: { effectiveThemeMode?: EmberColorSchemeEffectiveThemeMode } = {},
): EmberColorSchemeId {
  if (typeof document === "undefined") {
    return resolveEmberColorSchemeId(id);
  }

  const scheme = getEmberColorScheme(id);
  const root = document.documentElement;
  root.dataset.emberColorScheme = scheme.id;

  Object.entries(scheme.variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  const effectiveThemeMode =
    options.effectiveThemeMode ??
    (root.dataset.emberThemeEffective === "dark" ||
    root.classList.contains("dark")
      ? "dark"
      : "light");

  const mergedVariables =
    effectiveThemeMode === "dark"
      ? { ...scheme.variables, ...darkThemeVariableOverrides }
      : { ...scheme.variables };

  if (effectiveThemeMode === "dark") {
    Object.entries(darkThemeVariableOverrides).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }

  syncThemeAccentFromEmberVariables(root, mergedVariables, {
    effectiveThemeMode,
  });

  return scheme.id;
}

export function initializeEmberColorScheme(): EmberColorSchemeId {
  return applyEmberColorScheme(loadEmberColorSchemeId());
}

export function persistEmberColorScheme(id: string): EmberColorSchemeId {
  const resolvedId = applyEmberColorScheme(id);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(EMBER_COLOR_SCHEME_STORAGE_KEY, resolvedId);
    const detail: EmberColorSchemeChangedEventDetail = {
      colorSchemeId: resolvedId,
    };
    window.dispatchEvent(
      new CustomEvent(EMBER_COLOR_SCHEME_CHANGED_EVENT, { detail }),
    );
  }

  return resolvedId;
}
