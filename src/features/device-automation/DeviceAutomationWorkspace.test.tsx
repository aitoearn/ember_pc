import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceAutomationWorkspace } from "./DeviceAutomationWorkspace";
import { resetDeviceAutomationListSessionCacheForTests } from "./deviceListSessionCache";
import {
  listDeviceAutomationDevices,
  listenDeviceAutomationInventoryChanged,
} from "@/lib/api/deviceAutomation";
import type { DeviceAutomationInventoryChangedPayload } from "./events";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/api/deviceAutomation", () => ({
  listDeviceAutomationDevices: vi.fn(),
  listenDeviceAutomationInventoryChanged: vi.fn(),
  prewarmDeviceAutomationScrcpy: vi.fn(),
  sendDeviceAutomationNavigation: vi.fn(),
  sendDeviceAutomationSwipe: vi.fn(),
  sendDeviceAutomationTap: vi.fn(),
  reverseDeviceAutomationScrcpyTcp: vi.fn(),
  startDeviceAutomationScrcpy: vi.fn(),
}));

vi.mock("./performance/hooks/usePerformanceMonitor", () => ({
  usePerformanceMonitor: () => ({
    workspaceId: "ws-1",
    onlineDevices: [],
    selectedDeviceId: "",
    setSelectedDeviceId: vi.fn(),
    selectedDevice: null,
    apps: [],
    appsLoading: false,
    refreshApps: vi.fn(),
    packageName: "",
    setPackageName: vi.fn(),
    metrics: ["cpu"],
    toggleMetric: vi.fn(),
    intervalMs: 1000,
    setIntervalMs: vi.fn(),
    buffers: {
      cpu_app: [],
      cpu_sys: [],
      mem_total: [],
      fps: [],
    },
    phase: "idle",
    isRunning: false,
    canCollect: false,
    start: vi.fn(),
    stop: vi.fn(),
    history: [],
    historyLoading: false,
    selectedHistorySession: null,
    setSelectedHistorySession: vi.fn(),
    reloadHistory: vi.fn(),
  }),
}));

const mockConfirmLeaveTab = vi.fn(() => true);

vi.mock("./performance/hooks/usePerformanceTrace", () => ({
  usePerformanceTrace: () => ({
    onlineDevices: [],
    selectedDeviceId: "",
    setSelectedDeviceId: vi.fn(),
    selectedDevice: null,
    canRecord: false,
    apps: [],
    appsLoading: false,
    refreshApps: vi.fn(),
    packageName: "",
    setPackageName: vi.fn(),
    presetId: "scroll_jank",
    setPresetId: vi.fn(),
    phase: "idle",
    isRecording: false,
    progressPhase: null,
    artifacts: [],
    artifactsLoading: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    cancelRecording: vi.fn(),
    deleteArtifact: vi.fn(),
    openInPerfettoUi: vi.fn(),
    confirmLeaveTab: mockConfirmLeaveTab,
    selectedArtifactId: null,
    setSelectedArtifactId: vi.fn(),
    selectedArtifact: null,
    analyses: [],
    analysesLoading: false,
    analyzingType: null,
    runAnalysis: vi.fn(),
  }),
}));

const mockedListDevices = vi.mocked(listDeviceAutomationDevices);
const mockedListenInventoryChanged = vi.mocked(
  listenDeviceAutomationInventoryChanged,
);

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("DeviceAutomationWorkspace", () => {
  let container: HTMLDivElement;
  let root: Root;
  let inventoryChangedHandler:
    | ((payload: DeviceAutomationInventoryChangedPayload) => void)
    | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    inventoryChangedHandler = null;
    resetDeviceAutomationListSessionCacheForTests();
    mockConfirmLeaveTab.mockReset();
    mockConfirmLeaveTab.mockReturnValue(true);
    mockedListDevices.mockResolvedValue({ devices: [] });
    mockedListenInventoryChanged.mockImplementation((handler) => {
      inventoryChangedHandler = handler;
      return Promise.resolve(() => {
        inventoryChangedHandler = null;
      });
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("首屏加载不强制 force", async () => {
    await act(async () => {
      root.render(<DeviceAutomationWorkspace />);
    });

    expect(mockedListDevices).toHaveBeenCalledTimes(1);
    expect(mockedListDevices).toHaveBeenLastCalledWith(undefined);
  });

  it("收到设备库存变化事件后刷新设备列表", async () => {
    await act(async () => {
      root.render(<DeviceAutomationWorkspace />);
    });

    expect(mockedListDevices).toHaveBeenCalledTimes(1);
    expect(mockedListenInventoryChanged).toHaveBeenCalledTimes(1);
    expect(inventoryChangedHandler).not.toBeNull();

    await act(async () => {
      inventoryChangedHandler?.({
        source: "adb-track-devices",
        changedAt: new Date().toISOString(),
      });
    });

    expect(mockedListDevices).toHaveBeenCalledTimes(2);
  });

  it("默认展示设备管理 Tab 导航", async () => {
    await act(async () => {
      root.render(<DeviceAutomationWorkspace />);
    });

    expect(
      container.querySelector('[data-testid="device-automation-tab-devices"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="device-automation-tab-ui-auto-test"]'),
    ).not.toBeNull();
  });

  it("性能 Tab 加载设备列表并渲染监控面板", async () => {
    await act(async () => {
      root.render(
        <DeviceAutomationWorkspace pageParams={{ tab: "performance" }} />,
      );
    });

    expect(mockedListDevices).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('[data-testid="performance-monitor-panel"]'),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-testid="device-automation-placeholder-performance"]',
      ),
    ).toBeNull();
  });

  it("性能 Tab 支持 APM/Trace 模式切换且非占位", async () => {
    await act(async () => {
      root.render(
        <DeviceAutomationWorkspace pageParams={{ tab: "performance" }} />,
      );
    });

    expect(
      container.querySelector('[data-testid="performance-mode-switch"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="performance-live-charts"]'),
    ).not.toBeNull();

    const traceMode = container.querySelector(
      '[data-testid="performance-mode-trace"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      traceMode?.click();
    });

    expect(container.querySelector('[data-testid="perf-trace-panel"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="device-automation-placeholder-performance"]'),
    ).toBeNull();
  });

  it("切换 Tab 时通过 onNavigate 更新路由参数", async () => {
    const onNavigate = vi.fn();

    await act(async () => {
      root.render(<DeviceAutomationWorkspace onNavigate={onNavigate} />);
    });

    const uiAutoTestTab = container.querySelector(
      '[data-testid="device-automation-tab-ui-auto-test"]',
    ) as HTMLButtonElement | null;
    expect(uiAutoTestTab).not.toBeNull();

    await act(async () => {
      uiAutoTestTab?.click();
    });

    expect(onNavigate).toHaveBeenCalledWith("device-automation", {
      view: "list",
      tab: "ui-auto-test",
    });
  });

  it("Trace 录制中离开性能 Tab 需 confirmLeaveTab 确认", async () => {
    mockConfirmLeaveTab.mockReturnValue(false);
    const onNavigate = vi.fn();

    await act(async () => {
      root.render(
        <DeviceAutomationWorkspace
          pageParams={{ tab: "performance" }}
          onNavigate={onNavigate}
        />,
      );
    });

    const devicesTab = container.querySelector(
      '[data-testid="device-automation-tab-devices"]',
    ) as HTMLButtonElement | null;
    expect(devicesTab).not.toBeNull();

    await act(async () => {
      devicesTab?.click();
    });

    expect(mockConfirmLeaveTab).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
