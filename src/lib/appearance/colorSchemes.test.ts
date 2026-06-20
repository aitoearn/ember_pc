import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EMBER_COLOR_SCHEME_ID,
  EMBER_COLOR_SCHEME_CHANGED_EVENT,
  EMBER_COLOR_SCHEMES,
  EMBER_COLOR_SCHEME_STORAGE_KEY,
  applyEmberColorScheme,
  persistEmberColorScheme,
  resolveEmberColorSchemeId,
  loadEmberColorSchemeId,
} from "./colorSchemes";

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-ember-theme-effective");
  document.documentElement.removeAttribute("data-ember-color-scheme");
  document.documentElement.removeAttribute("style");
});

describe("colorSchemes", () => {
  it("未知配色应回退到 Ember 经典", () => {
    expect(resolveEmberColorSchemeId("unknown")).toBe(
      DEFAULT_EMBER_COLOR_SCHEME_ID,
    );
    expect(resolveEmberColorSchemeId(null)).toBe(DEFAULT_EMBER_COLOR_SCHEME_ID);
  });

  it("应提供参考图中的完整预设配色矩阵", () => {
    expect(EMBER_COLOR_SCHEMES.map((scheme) => scheme.label)).toEqual([
      "熠测",
      "自然",
      "海洋",
      "复古",
      "霓虹",
      "柠黄",
      "黄昏",
      "极简",
      "活力",
      "文艺",
      "奢华",
    ]);
    expect(
      EMBER_COLOR_SCHEMES.every((scheme) => scheme.swatches.length === 3),
    ).toBe(true);
  });

  it("应用配色时应写入根节点 dataset 与 CSS 变量", () => {
    const resolvedId = applyEmberColorScheme("ember-sand");

    expect(resolvedId).toBe("ember-sand");
    expect(document.documentElement.dataset.emberColorScheme).toBe("ember-sand");
    expect(
      document.documentElement.style.getPropertyValue("--ember-chrome-rail"),
    ).toBe("#f4f0e7");
    expect(
      document.documentElement.style.getPropertyValue("--ember-stage-surface"),
    ).toContain("#fbfaf4");
    expect(
      document.documentElement.style.getPropertyValue(
        "--ember-chrome-stage-blend",
      ),
    ).toContain("#fbfaf4");
    expect(
      document.documentElement.style.getPropertyValue(
        "--ember-chrome-stage-seam",
      ),
    ).toBe("rgba(84, 104, 76, 0.075)");
    expect(
      document.documentElement.style.getPropertyValue("--ember-sidebar-surface"),
    ).toContain("#eee9dd");
  });

  it("深色主题下切换配色时应继续保留深色表面变量", () => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.emberThemeEffective = "dark";

    const resolvedId = applyEmberColorScheme("ember-ocean");

    expect(resolvedId).toBe("ember-ocean");
    expect(document.documentElement.dataset.emberColorScheme).toBe("ember-ocean");
    expect(
      document.documentElement.style.getPropertyValue("--ember-app-bg"),
    ).toBe("#0b1120");
    expect(
      document.documentElement.style.getPropertyValue("--ember-surface"),
    ).toBe("#0f172a");
    expect(
      document.documentElement.style.getPropertyValue("--ember-brand-strong"),
    ).toBe("#86efac");
  });

  it("持久化配色时应写 localStorage 并派发变更事件", () => {
    const listener = vi.fn();
    window.addEventListener(EMBER_COLOR_SCHEME_CHANGED_EVENT, listener);

    const resolvedId = persistEmberColorScheme("ember-luxury");

    expect(resolvedId).toBe("ember-luxury");
    expect(localStorage.getItem(EMBER_COLOR_SCHEME_STORAGE_KEY)).toBe(
      "ember-luxury",
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: { colorSchemeId: "ember-luxury" },
    });

    window.removeEventListener(EMBER_COLOR_SCHEME_CHANGED_EVENT, listener);
  });

  it("应从 legacy localStorage 迁移 ember 配色 id", () => {
    localStorage.setItem("ember.appearance.color-scheme", "ember-sand");

    expect(loadEmberColorSchemeId()).toBe("ember-sand");
    expect(localStorage.getItem(EMBER_COLOR_SCHEME_STORAGE_KEY)).toBe(
      "ember-sand",
    );
    expect(localStorage.getItem("ember.appearance.color-scheme")).toBeNull();
  });

  it("legacy ember 配色 id 应通过 resolve 映射到 ember", () => {
    expect(resolveEmberColorSchemeId("ember-ocean")).toBe("ember-ocean");
  });
});
