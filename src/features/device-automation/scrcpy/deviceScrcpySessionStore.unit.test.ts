import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceAutomationCardModel } from "../types";
import { ScrcpyDirectClient } from "./ScrcpyDirectClient";
import {
  acquireDeviceScrcpySession,
  destroyDeviceScrcpySession,
  resetDeviceScrcpySessionForTests,
} from "./deviceScrcpySessionStore";

vi.mock("@/lib/api/deviceAutomation", () => ({
  teardownDeviceAutomationScrcpySession: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("./ScrcpyDirectClient", () => ({
  ScrcpyDirectClient: vi.fn().mockImplementation(function MockClient() {
    let closed = false;
    return {
      get closed() {
        return closed;
      },
      getVideo: vi.fn(async () => ({
        metadata: { width: 1080, height: 1920 },
        stream: new ReadableStream(),
        decoder: {
          writable: new WritableStream(),
          renderer: { element: document.createElement("video") },
        },
      })),
      getControl: vi.fn(async () => ({ controller: {} })),
      close: vi.fn(() => {
        closed = true;
      }),
    };
  }),
}));

const mockDevice: DeviceAutomationCardModel = {
  id: "emulator-5554",
  name: "Test",
  serial: "emulator-5554",
  platform: "android",
  agentPlatform: "android",
  status: "online",
  brand: "Generic",
  model: "Test",
  system: "Android",
  resolution: "1080x1920",
  group: "—",
  space: "—",
  connectionType: "usb",
};

describe("deviceScrcpySessionStore", () => {
  beforeEach(() => {
    resetDeviceScrcpySessionForTests();
    vi.clearAllMocks();
  });

  it("每次 acquire 创建新 client（不跨路由复用）", async () => {
    const first = await acquireDeviceScrcpySession(mockDevice);
    await destroyDeviceScrcpySession(mockDevice.id);
    const second = await acquireDeviceScrcpySession(mockDevice);
    expect(second).not.toBe(first);
    expect(ScrcpyDirectClient).toHaveBeenCalledTimes(2);
  });

  it("destroy 关闭 client 并触发 IPC teardown", async () => {
    const client = await acquireDeviceScrcpySession(mockDevice);
    await destroyDeviceScrcpySession(mockDevice.id);
    expect(client.close).toHaveBeenCalledTimes(1);
    const { teardownDeviceAutomationScrcpySession } = await import(
      "@/lib/api/deviceAutomation"
    );
    expect(teardownDeviceAutomationScrcpySession).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: mockDevice.id,
        killServer: true,
      }),
    );
  });
});
