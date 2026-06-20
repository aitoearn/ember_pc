export interface ThemeAccentPalette {
  lighter: string;
  light: string;
  default: string;
  dark: string;
  darker: string;
}

const DEFAULT_THEME_ACCENT: ThemeAccentPalette = {
  lighter: "#C8FAD6",
  light: "#5BE49B",
  default: "#00A76F",
  dark: "#007867",
  darker: "#004B50",
};

function readVariable(
  variables: Record<string, string>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = variables[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function resolveThemeAccentFromEmberVariables(
  variables: Record<string, string>,
): ThemeAccentPalette {
  return {
    lighter:
      readVariable(variables, "--ember-brand-soft") ??
      readVariable(variables, "--theme-lighter") ??
      DEFAULT_THEME_ACCENT.lighter,
    light:
      readVariable(variables, "--ember-brand-muted") ??
      readVariable(variables, "--theme-light") ??
      DEFAULT_THEME_ACCENT.light,
    default:
      readVariable(variables, "--ember-brand") ??
      readVariable(variables, "--theme-default") ??
      DEFAULT_THEME_ACCENT.default,
    dark:
      readVariable(variables, "--ember-brand-strong") ??
      readVariable(variables, "--theme-dark") ??
      DEFAULT_THEME_ACCENT.dark,
    darker:
      readVariable(variables, "--ember-brand-strong") ??
      readVariable(variables, "--theme-darker") ??
      DEFAULT_THEME_ACCENT.darker,
  };
}

export function applyThemeAccentVariables(
  root: HTMLElement,
  palette: ThemeAccentPalette,
  options: { mixBase?: string } = {},
): void {
  const mixBase = options.mixBase ?? "#ffffff";

  root.style.setProperty("--theme-lighter", palette.lighter);
  root.style.setProperty("--theme-light", palette.light);
  root.style.setProperty("--theme-default", palette.default);
  root.style.setProperty("--theme-dark", palette.dark);
  root.style.setProperty("--theme-darker", palette.darker);
  root.style.setProperty(
    "--theme-subtle",
    `color-mix(in srgb, ${palette.default} 8%, ${mixBase})`,
  );
  root.style.setProperty(
    "--theme-border",
    `color-mix(in srgb, ${palette.default} 24%, ${mixBase})`,
  );
  root.style.setProperty(
    "--theme-hover",
    `color-mix(in srgb, ${palette.default} 12%, ${mixBase})`,
  );

  root.style.setProperty("--primary-color", palette.default);
  root.style.setProperty("--primary-light", palette.lighter);
  root.style.setProperty("--primary-dark", palette.dark);
  root.style.setProperty("--claude-accent", palette.default);
  root.style.setProperty("--claude-accent-hover", palette.dark);
  root.style.setProperty(
    "--claude-accent-subtle",
    `color-mix(in srgb, ${palette.default} 8%, ${mixBase})`,
  );
}

export function syncThemeAccentFromEmberVariables(
  root: HTMLElement,
  variables: Record<string, string>,
  options: { effectiveThemeMode?: "light" | "dark" } = {},
): void {
  const palette = resolveThemeAccentFromEmberVariables(variables);
  const mixBase =
    options.effectiveThemeMode === "dark"
      ? (readVariable(variables, "--ember-surface") ?? "#0f172a")
      : "#ffffff";
  applyThemeAccentVariables(root, palette, { mixBase });
}
