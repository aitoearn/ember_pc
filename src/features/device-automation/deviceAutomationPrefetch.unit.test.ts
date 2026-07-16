import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  prefetchDeviceAutomationStartup,
  prefetchDeviceAutomationWorkspaceChunk,
  preloadDeviceAutomationDeviceList,
  resetDeviceAutomationPrefetchStateForTests,
} from "./deviceAutomationPrefetch";
import { resetDeviceAutomationListSessionCacheForTests, writeCachedDeviceAutomationList } from "./deviceListSessionCache";

const listDeviceAutomationDevices = vi.fn();
const hasDesktopHostInvokeCapability = vi.fn(() => true);
const loadDeviceAutomationWorkspace = vi.fn(() =>
  Promise.resolve({ default: vi.fn() }),
);

vi.mock("@/lib/api/deviceAutomation", () => ({
  listDeviceAutomationDevices: (...args: unknown[]) =>
    listDeviceAutomationDevices(...args),
}));

vi.mock("@/lib/desktop-runtime", () => ({
  hasDesktopHostInvokeCapability: () => hasDesktopHostInvokeCapability(),
}));

vi.mock("./loadDeviceAutomationWorkspace", () => ({
  loadDeviceAutomationWorkspace: () => loadDeviceAutomationWorkspace(),
}));

describe("deviceAutomationPrefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDeviceAutomationPrefetchStateForTests();
    resetDeviceAutomationListSessionCacheForTests();
    hasDesktopHostInvokeCapability.mockReturnValue(true);
    listDeviceAutomationDevices.mockResolvedValue({ devices: [] });
  });

  it("桌面环境下 startup prefetch 只拉一次 chunk 与设备列表", async () => {
    prefetchDeviceAutomationStartup();
    prefetchDeviceAutomationStartup();

    expect(loadDeviceAutomationWorkspace).toHaveBeenCalledTimes(1);
    expect(listDeviceAutomationDevices).toHaveBeenCalledTimes(1);

    await Promise.resolve();
  });

  it("已有会话缓存时跳过设备列表预拉", () => {
    writeCachedDeviceAutomationList([]);

    preloadDeviceAutomationDeviceList();

    expect(listDeviceAutomationDevices).not.toHaveBeenCalled();
  });

  it("非桌面环境不预拉设备列表", () => {
    hasDesktopHostInvokeCapability.mockReturnValue(false);

    preloadDeviceAutomationDeviceList();

    expect(listDeviceAutomationDevices).not.toHaveBeenCalled();
  });

  it("chunk prefetch 可单独调用", () => {
    prefetchDeviceAutomationWorkspaceChunk();
    prefetchDeviceAutomationWorkspaceChunk();

    expect(loadDeviceAutomationWorkspace).toHaveBeenCalledTimes(1);
    expect(listDeviceAutomationDevices).not.toHaveBeenCalled();
  });
});
