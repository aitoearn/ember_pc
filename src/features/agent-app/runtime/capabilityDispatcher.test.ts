import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDispatcherWithCloudSessionCapability } from "./capabilityDispatcherTestFixtures";

const loginLauncherMocks = vi.hoisted(() => ({
  startOemCloudLogin: vi.fn(),
}));

vi.mock("@/lib/oemCloudLoginLauncher", () => ({
  startOemCloudLogin: loginLauncherMocks.startOemCloudLogin,
}));

describe("createAgentAppCapabilityDispatcher cloud session component boundary", () => {
  beforeEach(() => {
    loginLauncherMocks.startOemCloudLogin.mockReset();
    delete (window as unknown as Record<string, unknown>).__EMBER_OEM_CLOUD__;
    delete (window as unknown as Record<string, unknown>).__EMBER_SESSION_TOKEN__;
  });

  afterEach(() => {
    loginLauncherMocks.startOemCloudLogin.mockReset();
    delete (window as unknown as Record<string, unknown>).__EMBER_OEM_CLOUD__;
    delete (window as unknown as Record<string, unknown>).__EMBER_SESSION_TOKEN__;
  });

  it("ember.cloudSession 只通过显式能力返回当前会话令牌，且 requestLogin 会唤起宿主登录", async () => {
    const dispatch = buildDispatcherWithCloudSessionCapability();
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
      sessionToken: "host-session-token",
    };

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "getSnapshot",
        rawPayload: {
          capability: "ember.cloudSession",
          method: "getSnapshot",
        },
      }),
    ).resolves.toMatchObject({
      controlPlaneBaseUrl: "https://user.emberai.run/api",
      tenantId: "tenant-0001",
      hasSession: true,
    });

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "getAccessToken",
        rawPayload: {
          capability: "ember.cloudSession",
          method: "getAccessToken",
        },
      }),
    ).resolves.toMatchObject({
      accessToken: "host-session-token",
      tenantId: "tenant-0001",
      controlPlaneBaseUrl: "https://user.emberai.run/api",
    });

    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
    };
    delete window.__EMBER_SESSION_TOKEN__;
    loginLauncherMocks.startOemCloudLogin.mockImplementation(async () => {
      window.__EMBER_SESSION_TOKEN__ = "fresh-host-session-token";
      window.__EMBER_OEM_CLOUD__ = {
        enabled: true,
        baseUrl: "https://user.emberai.run",
        tenantId: "tenant-0001",
        sessionToken: "fresh-host-session-token",
      };
      return {
        mode: "desktop_auth",
        openedUrl: "ember://oauth/callback",
      };
    });

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "requestLogin",
        rawPayload: {
          capability: "ember.cloudSession",
          method: "requestLogin",
        },
      }),
    ).resolves.toMatchObject({
      tenantId: "tenant-0001",
      hasSession: true,
      controlPlaneBaseUrl: "https://user.emberai.run/api",
    });
    expect(loginLauncherMocks.startOemCloudLogin).toHaveBeenCalledTimes(1);
  });

  it("ember.cloudSession.requestLogin 支持强制刷新已有宿主会话", async () => {
    const dispatch = buildDispatcherWithCloudSessionCapability();
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
      sessionToken: "stale-host-session-token",
    };
    loginLauncherMocks.startOemCloudLogin.mockImplementation(async () => {
      window.__EMBER_SESSION_TOKEN__ = "fresh-host-session-token";
      window.__EMBER_OEM_CLOUD__ = {
        enabled: true,
        baseUrl: "https://user.emberai.run",
        tenantId: "tenant-0001",
        sessionToken: "fresh-host-session-token",
      };
      return {
        mode: "desktop_auth",
        openedUrl: "ember://oauth/callback",
      };
    });

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "requestLogin",
        input: { force: true },
        rawPayload: {
          capability: "ember.cloudSession",
          method: "requestLogin",
          input: { force: true },
        },
      }),
    ).resolves.toMatchObject({
      tenantId: "tenant-0001",
      hasSession: true,
      controlPlaneBaseUrl: "https://user.emberai.run/api",
    });
    expect(loginLauncherMocks.startOemCloudLogin).toHaveBeenCalledTimes(1);
  });

  it("ember.cloudSession.getAccessToken 不返回已过期的宿主会话令牌", async () => {
    const dispatch = buildDispatcherWithCloudSessionCapability();
    const expiredToken = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJzdWIiOiJ1c2VyLTAwMDEiLCJ0ZW5hbnRJZCI6InRlbmFudC0wMDAxIiwiZXhwIjoxfQ",
      "signature",
    ].join(".");
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
      sessionToken: expiredToken,
    };

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "getAccessToken",
        rawPayload: {
          capability: "ember.cloudSession",
          method: "getAccessToken",
        },
      }),
    ).rejects.toMatchObject({
      code: "SESSION_REQUIRED",
    });
  });

  it("ember.cloudSession.requestLogin 遇到过期宿主会话令牌时会刷新", async () => {
    const dispatch = buildDispatcherWithCloudSessionCapability();
    const expiredToken = [
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "eyJzdWIiOiJ1c2VyLTAwMDEiLCJ0ZW5hbnRJZCI6InRlbmFudC0wMDAxIiwiZXhwIjoxfQ",
      "signature",
    ].join(".");
    window.__EMBER_OEM_CLOUD__ = {
      enabled: true,
      baseUrl: "https://user.emberai.run",
      tenantId: "tenant-0001",
      sessionToken: expiredToken,
    };
    loginLauncherMocks.startOemCloudLogin.mockImplementation(async () => {
      window.__EMBER_SESSION_TOKEN__ = "fresh-host-session-token";
      window.__EMBER_OEM_CLOUD__ = {
        enabled: true,
        baseUrl: "https://user.emberai.run",
        tenantId: "tenant-0001",
        sessionToken: "fresh-host-session-token",
      };
      return {
        mode: "desktop_auth",
        openedUrl: "ember://oauth/callback",
      };
    });

    await expect(
      dispatch({
        appId: "content-factory-app",
        entryKey: "dashboard",
        capability: "ember.cloudSession",
        method: "requestLogin",
        rawPayload: {
          capability: "ember.cloudSession",
          method: "requestLogin",
        },
      }),
    ).resolves.toMatchObject({
      tenantId: "tenant-0001",
      hasSession: true,
      controlPlaneBaseUrl: "https://user.emberai.run/api",
    });
    expect(loginLauncherMocks.startOemCloudLogin).toHaveBeenCalledTimes(1);
  });
});
