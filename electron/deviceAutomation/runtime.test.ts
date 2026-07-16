import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentDeviceCliRecord } from "./agentDeviceCli";
import {
  DeviceAutomationRuntime,
  resetDeviceAutomationRuntimeStateForTests,
} from "./runtime";

vi.mock("./agentDeviceCli", () => ({
  captureAgentDeviceScreenshot: vi.fn(() => "/tmp/fallback.png"),
  listAgentDevices: vi.fn(() => [
    {
      platform: "android",
      id: "slow-android",
      name: "slow-android",
      kind: "device",
    },
    {
      platform: "ios",
      id: "ios-1",
      name: "iPhone",
      kind: "simulator",
    },
  ]),
  probeAgentDeviceInstallation: vi.fn(() => ({
    rootPath: "/tmp/agent-device",
    stateDir: "/tmp/agent-device-state",
  })),
  readScreenshotBase64: vi.fn(() => ({
    base64: "fallback",
    mediaType: "image/png",
  })),
  sendAgentDeviceNavigation: vi.fn(),
  sendAgentDevicePress: vi.fn(),
  sendAgentDeviceSwipe: vi.fn(),
}));

vi.mock("./agentDeviceDaemonClient", () => ({
  captureAgentDeviceScreenshotViaDaemon: vi.fn(() =>
    Promise.resolve("/tmp/daemon.png"),
  ),
  listAgentDevicesViaDaemon: vi.fn(() =>
    Promise.resolve([
      {
        platform: "android",
        id: "daemon-android",
        name: "daemon-android",
        kind: "device",
      },
      {
        platform: "ios",
        id: "ios-1",
        name: "iPhone",
        kind: "simulator",
      },
    ]),
  ),
  sendAgentDeviceNavigationViaDaemon: vi.fn(() => Promise.resolve(true)),
  sendAgentDevicePressViaDaemon: vi.fn(() => Promise.resolve(true)),
  sendAgentDeviceSwipeViaDaemon: vi.fn(() => Promise.resolve(true)),
  reverseAgentDeviceScrcpyTcpViaDaemon: vi.fn(() =>
    Promise.resolve({ port: 43210 }),
  ),
  startAgentDeviceScrcpyViaDaemon: vi.fn(() =>
    Promise.resolve({ pid: 123, version: "3.1" }),
  ),
  connectAgentDeviceScrcpyViaDaemon: vi.fn(() =>
    Promise.resolve({
      reverse: { port: 43210 },
      start: { pid: 123, version: "3.1" },
    }),
  ),
  warmAgentDeviceSessionViaDaemon: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("./autoGlmApi", () => ({
  cancelAutoGlmTask: vi.fn(),
  createAutoGlmTaskSession: vi.fn(),
  getAutoGlmSidecarStatus: vi.fn(() => Promise.resolve({ ready: false })),
  getAutoGlmTask: vi.fn(),
  listAutoGlmTaskEvents: vi.fn(),
  submitAutoGlmTaskSessionTask: vi.fn(),
}));

vi.mock("./scrcpyAdbFastPath", () => ({
  execAdbSync: vi.fn(() => ({ stdout: "", stderr: "", exitCode: 0 })),
  reverseScrcpyTcpFast: vi.fn(() => ({
    port: 43210,
    transport: "adb-fast-path",
  })),
  startScrcpyServerFast: vi.fn(() => ({
    pid: 123,
    version: "3.1",
    transport: "adb-fast-path",
  })),
  prewarmScrcpyJarFast: vi.fn(() => ({ status: "scheduled" })),
  sendAndroidNavigationFast: vi.fn(() => ({
    deviceId: "emulator-5554",
    keyCode: 4,
    transport: "adb-fast-path",
  })),
  stopScrcpyServerFast: vi.fn(() => ({
    deviceId: "emulator-5554",
    exitCode: 0,
    transport: "adb-fast-path",
  })),
}));

vi.mock("./androidDeviceMetadata", () => ({
  enrichAndroidDeviceRecords: vi.fn((devices: AgentDeviceCliRecord[]) =>
    Promise.resolve(devices),
  ),
  resetAndroidDeviceMetadataCacheForTests: vi.fn(),
}));

describe("DeviceAutomationRuntime", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetDeviceAutomationRuntimeStateForTests();
  });

  it("非 force 且有 Android 快照时先返回快路径，不阻塞 agent-device daemon", async () => {
    const daemonClient = await import("./agentDeviceDaemonClient");
    let releaseDaemon: ((value: AgentDeviceCliRecord[]) => void) | null = null;
    vi.mocked(daemonClient.listAgentDevicesViaDaemon).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseDaemon = resolve;
        }),
    );

    const runtime = new DeviceAutomationRuntime({
      getAndroidDevices: () => [
        {
          platform: "android",
          id: "emulator-5554",
          name: "emulator-5554",
          kind: "device",
          target: "emulator-5554",
          booted: true,
        },
      ],
    });

    const response = await runtime.listDevices();

    expect(response.devices).toEqual([
      {
        platform: "android",
        id: "emulator-5554",
        name: "emulator-5554",
        kind: "device",
        target: "emulator-5554",
        booted: true,
      },
    ]);
    expect(releaseDaemon).not.toBeNull();

    releaseDaemon?.([
      {
        platform: "ios",
        id: "ios-1",
        name: "iPhone",
        kind: "simulator",
      },
    ]);
    await vi.waitFor(() => {
      expect(daemonClient.listAgentDevicesViaDaemon).toHaveBeenCalledTimes(1);
    });
  });

  it("force 仍会阻塞等待 agent-device 并合并非 Android 设备", async () => {
    const runtime = new DeviceAutomationRuntime({
      getAndroidDevices: () => [
        {
          platform: "android",
          id: "emulator-5554",
          name: "emulator-5554",
          kind: "device",
          target: "emulator-5554",
          booted: true,
        },
      ],
    });

    const response = await runtime.listDevices({ force: true });

    expect(response.devices).toEqual([
      {
        platform: "android",
        id: "emulator-5554",
        name: "emulator-5554",
        kind: "device",
        target: "emulator-5554",
        booted: true,
      },
    ]);
  });

  it("force 会保留已启动的 iOS 模拟器", async () => {
    const daemonClient = await import("./agentDeviceDaemonClient");
    vi.mocked(daemonClient.listAgentDevicesViaDaemon).mockResolvedValueOnce([
      {
        platform: "ios",
        id: "ios-booted",
        name: "iPhone 16 Pro",
        kind: "simulator",
        booted: true,
      },
      {
        platform: "ios",
        id: "ios-shutdown",
        name: "iPhone 17 Pro",
        kind: "simulator",
        booted: false,
      },
    ]);

    const runtime = new DeviceAutomationRuntime();
    const response = await runtime.listDevices({ force: true });

    expect(response.devices).toEqual([
      {
        platform: "ios",
        id: "ios-booted",
        name: "iPhone 16 Pro",
        kind: "simulator",
        booted: true,
      },
    ]);
  });

  it("截图和触控优先走 agent-device daemon，Android 导航走 adb input keyevent 快路径", async () => {
    const agentDeviceCli = await import("./agentDeviceCli");
    const daemonClient = await import("./agentDeviceDaemonClient");
    const fastPath = await import("./scrcpyAdbFastPath");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await runtime.captureScreenshot({
      platform: "android",
      deviceId: "emulator-5554",
    });
    await runtime.sendNavigation({
      action: "back",
      platform: "android",
      deviceId: "emulator-5554",
    });
    await runtime.sendTap({
      platform: "android",
      deviceId: "emulator-5554",
      x: 1,
      y: 2,
    });
    await runtime.sendSwipe({
      platform: "android",
      deviceId: "emulator-5554",
      x1: 1,
      y1: 2,
      x2: 3,
      y2: 4,
    });

    expect(daemonClient.captureAgentDeviceScreenshotViaDaemon).toHaveBeenCalled();
    expect(fastPath.sendAndroidNavigationFast).toHaveBeenCalledWith({
      deviceId: "emulator-5554",
      action: "back",
    });
    expect(daemonClient.sendAgentDeviceNavigationViaDaemon).not.toHaveBeenCalled();
    expect(daemonClient.sendAgentDevicePressViaDaemon).toHaveBeenCalled();
    expect(daemonClient.sendAgentDeviceSwipeViaDaemon).toHaveBeenCalled();
    expect(agentDeviceCli.captureAgentDeviceScreenshot).not.toHaveBeenCalled();
    expect(agentDeviceCli.sendAgentDeviceNavigation).not.toHaveBeenCalled();
    expect(agentDeviceCli.sendAgentDevicePress).not.toHaveBeenCalled();
    expect(agentDeviceCli.sendAgentDeviceSwipe).not.toHaveBeenCalled();
  });

  it("非 Android 导航仍走 agent-device", async () => {
    const daemonClient = await import("./agentDeviceDaemonClient");
    const fastPath = await import("./scrcpyAdbFastPath");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await runtime.sendNavigation({
      action: "home",
      platform: "ios",
      deviceId: "ios-1",
    });

    expect(fastPath.sendAndroidNavigationFast).not.toHaveBeenCalled();
    expect(daemonClient.sendAgentDeviceNavigationViaDaemon).toHaveBeenCalled();
  });

  it("scrcpy reverse/start 优先走 adb 快路径", async () => {
    const fastPath = await import("./scrcpyAdbFastPath");
    const daemonClient = await import("./agentDeviceDaemonClient");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await expect(
      runtime.reverseScrcpyTcp({
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
      }),
    ).resolves.toMatchObject({ port: 43210, transport: "adb-fast-path" });
    await expect(
      runtime.startScrcpy({
        deviceId: "emulator-5554",
        scid: "00000042",
        maxSize: 1280,
        videoBitRate: 4_000_000,
        audio: false,
      }),
    ).resolves.toMatchObject({ pid: 123, transport: "adb-fast-path" });

    expect(fastPath.reverseScrcpyTcpFast).toHaveBeenCalled();
    expect(fastPath.stopScrcpyServerFast).toHaveBeenCalledWith("emulator-5554");
    expect(fastPath.startScrcpyServerFast).toHaveBeenCalled();
    expect(daemonClient.reverseAgentDeviceScrcpyTcpViaDaemon).not.toHaveBeenCalled();
    expect(daemonClient.startAgentDeviceScrcpyViaDaemon).not.toHaveBeenCalled();
  });

  it("scrcpy launch 单次 IPC 内 reverse 同步 + start 后台触发", async () => {
    const fastPath = await import("./scrcpyAdbFastPath");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await expect(
      runtime.launchScrcpy({
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
        scid: "00000042",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fastPath.reverseScrcpyTcpFast).toHaveBeenCalled();
    expect(fastPath.startScrcpyServerFast).toHaveBeenCalled();
  });

  it("scrcpy connect 合并 reverse/start 为单次 daemon 批量 RPC", async () => {
    const daemonClient = await import("./agentDeviceDaemonClient");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await expect(
      runtime.connectScrcpy({
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
        scid: "00000042",
        maxSize: 1280,
        videoBitRate: 4_000_000,
        audio: false,
      }),
    ).resolves.toEqual({
      reverse: { port: 43210 },
      start: { pid: 123, version: "3.1" },
    });

    expect(daemonClient.connectAgentDeviceScrcpyViaDaemon).toHaveBeenCalledWith(
      "/tmp/agent-device-state",
      {
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
        scid: "00000042",
        scrcpyServerPath: "/resources/device-automation/scrcpy.jar",
        maxSize: 1280,
        videoBitRate: 4_000_000,
        audio: false,
      },
    );
  });

  it("scrcpy reverse 端口不一致时抛出明确错误", async () => {
    const fastPath = await import("./scrcpyAdbFastPath");
    const daemonClient = await import("./agentDeviceDaemonClient");
    vi.mocked(fastPath.reverseScrcpyTcpFast).mockImplementationOnce(() => {
      throw new Error("adb 快路径不可用");
    });
    vi.mocked(daemonClient.reverseAgentDeviceScrcpyTcpViaDaemon).mockResolvedValueOnce({
      port: 11111,
      reused: true,
    });
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });

    await expect(
      runtime.reverseScrcpyTcp({
        deviceId: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
      }),
    ).rejects.toThrow(/adb reverse 端口不一致/);
  });

  it("prewarmScrcpy 委托 adb 快路径 jar 预热", async () => {
    const fastPath = await import("./scrcpyAdbFastPath");
    const runtime = new DeviceAutomationRuntime({
      resolveScrcpyServerPath: () => "/resources/device-automation/scrcpy.jar",
    });
    const result = runtime.prewarmScrcpy({ deviceId: "emulator-5554" });
    expect(result).toEqual({ status: "scheduled" });
    expect(fastPath.prewarmScrcpyJarFast).toHaveBeenCalledWith({
      deviceId: "emulator-5554",
      scrcpyServerPath: "/resources/device-automation/scrcpy.jar",
    });
  });
});
