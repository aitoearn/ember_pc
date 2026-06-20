import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceAutomationCardModel } from "../../types";
import { PerformanceMonitorPanel } from "./PerformanceMonitorPanel";

const mockMonitor = {
  workspaceId: "ws-1",
  onlineDevices: [] as DeviceAutomationCardModel[],
  selectedDeviceId: "",
  setSelectedDeviceId: vi.fn(),
  selectedDevice: null as DeviceAutomationCardModel | null,
  apps: [],
  appsLoading: false,
  refreshApps: vi.fn(),
  packageName: "",
  setPackageName: vi.fn(),
  metrics: ["cpu", "memory", "fps"] as const,
  toggleMetric: vi.fn(),
  intervalMs: 1000 as const,
  setIntervalMs: vi.fn(),
  buffers: {
    cpu_app: [],
    cpu_sys: [],
    mem_total: [],
    fps: [],
  },
  phase: "idle" as const,
  isRunning: false,
  canCollect: false,
  start: vi.fn(),
  stop: vi.fn(),
  history: [],
  historyLoading: false,
  selectedHistorySession: null,
  setSelectedHistorySession: vi.fn(),
  reloadHistory: vi.fn(),
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../hooks/usePerformanceMonitor", () => ({
  usePerformanceMonitor: () => mockMonitor,
}));

const mockTrace = {
  onlineDevices: [] as DeviceAutomationCardModel[],
  selectedDeviceId: "",
  setSelectedDeviceId: vi.fn(),
  selectedDevice: null as DeviceAutomationCardModel | null,
  canRecord: false,
  apps: [],
  appsLoading: false,
  refreshApps: vi.fn(),
  packageName: "",
  setPackageName: vi.fn(),
  presetId: "scroll_jank" as const,
  setPresetId: vi.fn(),
  phase: "idle" as const,
  isRecording: false,
  progressPhase: null,
  artifacts: [],
  artifactsLoading: false,
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  cancelRecording: vi.fn(),
  deleteArtifact: vi.fn(),
  openInPerfettoUi: vi.fn(),
  confirmLeaveTab: vi.fn(() => true),
  selectedArtifactId: null,
  setSelectedArtifactId: vi.fn(),
  selectedArtifact: null,
  analyses: [],
  analysesLoading: false,
  analyzingType: null,
  runAnalysis: vi.fn(),
};

vi.mock("../hooks/usePerformanceTrace", () => ({
  usePerformanceTrace: () => mockTrace,
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("PerformanceMonitorPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockMonitor.onlineDevices = [];
    mockMonitor.selectedDevice = null;
    mockMonitor.canCollect = false;
    mockMonitor.history = [];
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("渲染性能监控面板", async () => {
    await act(async () => {
      root.render(<PerformanceMonitorPanel devices={[]} />);
    });

    expect(
      container.querySelector('[data-testid="performance-monitor-panel"]'),
    ).not.toBeNull();
  });

  it("非 Android 设备禁用开始按钮", async () => {
    mockMonitor.onlineDevices = [
      {
        id: "ios-1",
        serial: "ios-1",
        name: "iPhone",
        brand: "Apple",
        model: "iPhone",
        system: "iOS",
        resolution: "—",
        group: "local",
        space: "—",
        status: "online",
        platform: "ios",
        agentPlatform: "ios",
        connectionType: "usb",
      },
    ];
    mockMonitor.selectedDevice = mockMonitor.onlineDevices[0] ?? null;
    mockMonitor.selectedDeviceId = "ios-1";
    mockMonitor.canCollect = false;

    await act(async () => {
      root.render(<PerformanceMonitorPanel devices={mockMonitor.onlineDevices} />);
    });

    const startButton = container.querySelector(
      '[data-testid="performance-start-button"]',
    ) as HTMLButtonElement | null;
    expect(startButton?.disabled).toBe(true);
    expect(
      container.querySelector('[data-testid="performance-platform-unsupported"]'),
    ).not.toBeNull();
  });

  it("空历史列表展示空态", async () => {
    await act(async () => {
      root.render(<PerformanceMonitorPanel devices={[]} />);
    });

    expect(container.textContent).toContain(
      "deviceAutomation.performance.history.empty",
    );
  });

  it("可切换到深度 Trace 模式", async () => {
    await act(async () => {
      root.render(<PerformanceMonitorPanel devices={[]} />);
    });

    const traceTab = container.querySelector(
      '[data-testid="performance-mode-trace"]',
    ) as HTMLButtonElement | null;
    expect(traceTab).not.toBeNull();

    await act(async () => {
      traceTab?.click();
    });

    expect(container.querySelector('[data-testid="perf-trace-panel"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="performance-live-charts"]'),
    ).toBeNull();
  });
});
