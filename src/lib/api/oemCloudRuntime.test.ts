import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setStoredOemCloudSessionState } from "@/lib/oemCloudSession";
import { resolveOemCloudRuntimeContext } from "./oemCloudRuntime";

describe("oemCloudRuntime", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__EMBER_BOOTSTRAP__;
    delete window.__EMBER_OEM_CLOUD__;
    delete window.__EMBER_SESSION_TOKEN__;
  });

  afterEach(() => {
    window.localStorage.clear();
    delete window.__EMBER_BOOTSTRAP__;
    delete window.__EMBER_OEM_CLOUD__;
    delete window.__EMBER_SESSION_TOKEN__;
  });

  it("应优先从运行时配置解析基础地址与 Ember Hub 元信息", () => {
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run/",
      gatewayBaseUrl: "https://gateway-api.emberai.run/root/",
      tenantId: "tenant-0001",
      hubProviderName: "Acme Hub",
      sessionToken: "runtime-session-token",
      loginPath: "/login",
      desktopClientId: "emberhub-desktop",
      desktopOauthRedirectUrl: "ember://oauth/callback",
      desktopOauthNextPath: "/welcome",
    };

    expect(resolveOemCloudRuntimeContext()).toEqual({
      baseUrl: "https://user.emberai.run",
      controlPlaneBaseUrl: "https://user.emberai.run/api",
      sceneBaseUrl: "https://user.emberai.run/scene-api",
      gatewayBaseUrl: "https://gateway-api.emberai.run/root",
      tenantId: "tenant-0001",
      sessionToken: "runtime-session-token",
      hubProviderName: "Acme Hub",
      loginPath: "/login",
      desktopClientId: "emberhub-desktop",
      desktopOauthRedirectUrl: "ember://oauth/callback",
      desktopOauthNextPath: "/welcome",
    });
  });

  it("未显式提供 gatewayBaseUrl 时应回退到 baseUrl/gateway-api", () => {
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
    };

    expect(resolveOemCloudRuntimeContext()).toMatchObject({
      baseUrl: "https://user.emberai.run",
      gatewayBaseUrl: "https://user.emberai.run/gateway-api",
      tenantId: "tenant-0001",
      hubProviderName: null,
      loginPath: "/login",
      desktopClientId: "desktop-client",
      desktopOauthRedirectUrl: "ember://oauth/callback",
      desktopOauthNextPath: "/welcome",
    });
  });

  it("运行时缺租户时应回退复用本地持久化会话", () => {
    setStoredOemCloudSessionState({
      token: "persisted-session-token",
      tenant: {
        id: "tenant-from-storage",
      },
      user: {
        id: "user-001",
      },
      session: {
        id: "session-001",
      },
    });

    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
    };

    expect(resolveOemCloudRuntimeContext()).toMatchObject({
      baseUrl: "https://user.emberai.run",
      gatewayBaseUrl: "https://user.emberai.run/gateway-api",
      tenantId: "tenant-from-storage",
      sessionToken: "persisted-session-token",
      loginPath: "/login",
      desktopClientId: "desktop-client",
      desktopOauthRedirectUrl: "ember://oauth/callback",
      desktopOauthNextPath: "/welcome",
    });
  });
});
