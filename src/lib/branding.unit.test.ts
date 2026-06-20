import { describe, expect, it } from "vitest";

import {
  buildPublicAssetUrl,
  EMBER_BRAND_NAME,
  EMBER_BRAND_NAME_ZH,
  resolveEmberBrandDisplayName,
} from "./branding";

describe("buildPublicAssetUrl", () => {
  it("Electron file URL 打包态应使用相对公共资源路径", () => {
    expect(buildPublicAssetUrl("logo.png", "./")).toBe("./logo.png");
  });

  it("浏览器开发态应保留根路径公共资源", () => {
    expect(buildPublicAssetUrl("logo.png", "/")).toBe("/logo.png");
  });

  it("应支持子路径部署并规整文件名前导斜杠", () => {
    expect(buildPublicAssetUrl("/logo.png", "/app")).toBe("/app/logo.png");
  });
});

describe("resolveEmberBrandDisplayName", () => {
  it("中文 locale 应显示熠测", () => {
    expect(resolveEmberBrandDisplayName("zh-CN")).toBe(EMBER_BRAND_NAME_ZH);
    expect(resolveEmberBrandDisplayName("zh-TW")).toBe(EMBER_BRAND_NAME_ZH);
  });

  it("非中文 locale 应显示 Ember", () => {
    expect(resolveEmberBrandDisplayName("en-US")).toBe(EMBER_BRAND_NAME);
    expect(resolveEmberBrandDisplayName("ja-JP")).toBe(EMBER_BRAND_NAME);
  });
});
