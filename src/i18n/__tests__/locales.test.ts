import { describe, expect, it, vi, afterEach } from "vitest";
import {
  normalizeLocale,
  normalizeLocalePreference,
  isRtlLocale,
  resolveDocumentDirection,
  resolveLocaleOptionLabel,
  toLegacyPatchLanguage,
  UI_LOCALE_OPTIONS,
} from "../locales";

describe("i18n locale registry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("应把旧语言值归一到当前受支持 locale", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("zh_Hant")).toBe("zh-CN");
    expect(normalizeLocale("ja")).toBe("en-US");
    expect(normalizeLocale("ko-KR")).toBe("en-US");
    expect(normalizeLocale("ja-JP")).toBe("en-US");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
  });

  it("应保留 auto 偏好但运行时解析到受支持 locale", () => {
    vi.stubGlobal("navigator", {
      language: "en-GB",
      languages: ["en-GB"],
    });

    expect(normalizeLocalePreference("auto")).toBe("auto");
    expect(normalizeLocale("auto")).toBe("en-US");
  });

  it("应把 locale 映射到 Patch 兼容层", () => {
    expect(toLegacyPatchLanguage("en-US")).toBe("en");
    expect(toLegacyPatchLanguage("zh-TW")).toBe("zh");
    expect(toLegacyPatchLanguage("ja-JP")).toBe("en");
  });

  it("应只提供简体中文与 English 界面语言选项", () => {
    const selectableIds = UI_LOCALE_OPTIONS.map((option) => option.id);
    expect(selectableIds).toEqual(["auto", "zh-CN", "en-US"]);
  });

  it("应提供语言选项显示名", () => {
    expect(resolveLocaleOptionLabel("auto")).toBe("跟随系统");
    expect(resolveLocaleOptionLabel("en")).toBe("English");
    expect(resolveLocaleOptionLabel("unknown")).toBe("简体中文");
  });

  it("应识别 RTL 语言并同步文档方向", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("fa-IR")).toBe(true);
    expect(isRtlLocale("en-US")).toBe(false);
    expect(resolveDocumentDirection("ar")).toBe("rtl");
    expect(resolveDocumentDirection("zh-CN")).toBe("ltr");
  });
});
