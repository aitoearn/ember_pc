import { afterEach, describe, expect, it } from "vitest";
import {
  applyThemeAccentVariables,
  resolveThemeAccentFromEmberVariables,
  syncThemeAccentFromEmberVariables,
} from "./themeAccent";

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("themeAccent", () => {
  it("应从 Ember 品牌变量解析主题色阶", () => {
    const palette = resolveThemeAccentFromEmberVariables({
      "--ember-brand-soft": "#C8FAD6",
      "--ember-brand-muted": "#5BE49B",
      "--ember-brand": "#00A76F",
      "--ember-brand-strong": "#007867",
    });

    expect(palette.default).toBe("#00A76F");
    expect(palette.dark).toBe("#007867");
  });

  it("当 scheme 同时提供 --theme-default 与 --ember-brand 时，应优先采用 --ember-brand", () => {
    const palette = resolveThemeAccentFromEmberVariables({
      "--theme-default": "#FDA92D",
      "--theme-dark": "#B66816",
      "--ember-brand-soft": "#eef4e8",
      "--ember-brand-muted": "#6f8f53",
      "--ember-brand": "#2f6f46",
      "--ember-brand-strong": "#234f36",
    });

    expect(palette.default).toBe("#2f6f46");
    expect(palette.dark).toBe("#234f36");
    expect(palette.lighter).toBe("#eef4e8");
  });

  it("应用主题色时应写入 --theme-* 派生变量", () => {
    applyThemeAccentVariables(document.documentElement, {
      lighter: "#C8FAD6",
      light: "#5BE49B",
      default: "#00A76F",
      dark: "#007867",
      darker: "#004B50",
    });

    expect(
      document.documentElement.style.getPropertyValue("--theme-default"),
    ).toBe("#00A76F");
    expect(
      document.documentElement.style.getPropertyValue("--theme-subtle"),
    ).toContain("color-mix");
  });

  it("syncThemeAccentFromEmberVariables 在深色模式下应使用表面色作为混色基底", () => {
    syncThemeAccentFromEmberVariables(
      document.documentElement,
      {
        "--ember-brand": "#34d399",
        "--ember-brand-strong": "#86efac",
        "--ember-surface": "#0f172a",
      },
      { effectiveThemeMode: "dark" },
    );

    expect(
      document.documentElement.style.getPropertyValue("--theme-default"),
    ).toBe("#34d399");
    expect(
      document.documentElement.style.getPropertyValue("--theme-subtle"),
    ).toContain("#0f172a");
  });
});
