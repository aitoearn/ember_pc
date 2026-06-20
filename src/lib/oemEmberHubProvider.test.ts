import { describe, expect, it } from "vitest";
import {
  buildOemEmberHubApiHost,
  DEFAULT_OEM_EMBER_HUB_PROVIDER_NAME,
  isLegacyProxyCastHubProvider,
  OEM_EMBER_HUB_PROVIDER_ID,
  resolveOemEmberHubProviderName,
} from "./oemEmberHubProvider";

describe("oemEmberHubProvider", () => {
  it("应从运行时配置提取 Ember Hub 网关地址", () => {
    expect(
      buildOemEmberHubApiHost({
        gatewayBaseUrl: "https://user.emberai.run/gateway-api/",
        tenantId: "tenant-0001",
      }),
    ).toBe("https://user.emberai.run/gateway-api#ember_tenant_id=tenant-0001");
  });

  it("应在缺少租户时只返回网关地址", () => {
    expect(
      buildOemEmberHubApiHost({
        gatewayBaseUrl: "https://llm.emberai.run/",
        tenantId: "",
      }),
    ).toBe("https://llm.emberai.run");
  });

  it("应在未配置品牌名时回退默认 Ember Hub 名称", () => {
    expect(resolveOemEmberHubProviderName(null)).toBe(
      DEFAULT_OEM_EMBER_HUB_PROVIDER_NAME,
    );
    expect(
      resolveOemEmberHubProviderName({
        hubProviderName: "   ",
      }),
    ).toBe(DEFAULT_OEM_EMBER_HUB_PROVIDER_NAME);
  });

  it("应识别旧 ProxyCast Hub 兼容项，但保留新的 ember-hub 系统 provider", () => {
    expect(
      isLegacyProxyCastHubProvider({
        id: OEM_EMBER_HUB_PROVIDER_ID,
        name: "Ember Hub",
        api_host: "https://user.emberai.run/gateway-api",
      }),
    ).toBe(false);

    expect(
      isLegacyProxyCastHubProvider({
        id: "proxycast-hub",
        name: "ProxyCast Hub",
        api_host: "https://proxycast.example.com/v1",
      }),
    ).toBe(true);

    expect(
      isLegacyProxyCastHubProvider({
        id: "custom-provider",
        name: "Legacy Provider",
        api_host: "https://proxycast.example.com/v1",
      }),
    ).toBe(true);
  });
});
