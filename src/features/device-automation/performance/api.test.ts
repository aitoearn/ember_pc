import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppServerClient } from "@/lib/api/appServer";
import {
  analyzePerformanceTrace,
  deletePerformanceTraceLocalFile,
  listPerformanceApps,
  listPerformanceSessions,
  listPerformanceTraceAnalyses,
  listPerformanceTraceArtifacts,
  readPerformanceSession,
  savePerformanceSession,
  savePerformanceTraceAnalysis,
  startPerformanceCollection,
  stopPerformanceCollection,
} from "@/lib/api/deviceAutomationPerformance";
import type { PerformanceSession, PerformanceTraceAnalysis, PerformanceTraceArtifact } from "./types";

vi.mock("@/lib/dev-bridge/safeInvoke", () => ({
  safeInvoke: vi.fn(),
}));

import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";

type TestClient = Pick<AppServerClient, "request">;

function makeClient(result: unknown) {
  const request = vi.fn(async () => ({ result }));
  const client = { request } as unknown as TestClient;
  return { client, request };
}

const sampleSession: PerformanceSession = {
  id: "sess-1",
  workspaceId: "ws-1",
  deviceId: "emulator-5554",
  devicePlatform: "android",
  packageName: "com.demo.app",
  metrics: ["cpu", "memory", "fps"],
  intervalMs: 1000,
  status: "stopped",
  startedAt: "2026-06-17T00:00:00.000Z",
  stoppedAt: "2026-06-17T00:01:00.000Z",
  summary: {
    cpu_app: { avg: 10, max: 20, min: 5 },
  },
};

describe("deviceAutomationPerformance api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("savePerformanceSession 使用 perfMonitor/session/save", async () => {
    const { client, request } = makeClient({ session: sampleSession });
    const saved = await savePerformanceSession(sampleSession, client);
    expect(request).toHaveBeenCalledWith("perfMonitor/session/save", {
      session: sampleSession,
    });
    expect(saved).toEqual(sampleSession);
  });

  it("listPerformanceSessions 使用 perfMonitor/session/list", async () => {
    const { client, request } = makeClient({ sessions: [sampleSession] });
    const sessions = await listPerformanceSessions("ws-1", { limit: 20 }, client);
    expect(request).toHaveBeenCalledWith("perfMonitor/session/list", {
      workspaceId: "ws-1",
      limit: 20,
      offset: undefined,
    });
    expect(sessions).toEqual([sampleSession]);
  });

  it("readPerformanceSession 使用 perfMonitor/session/read", async () => {
    const { client, request } = makeClient({ session: sampleSession });
    const session = await readPerformanceSession("sess-1", client);
    expect(request).toHaveBeenCalledWith("perfMonitor/session/read", {
      id: "sess-1",
    });
    expect(session).toEqual(sampleSession);
  });

  it("listPerformanceApps 调用 device_automation_perf_list_apps", async () => {
    vi.mocked(safeInvoke).mockResolvedValueOnce({
      apps: [{ packageName: "com.demo.app" }],
    });
    const apps = await listPerformanceApps({
      platform: "android",
      deviceId: "emulator-5554",
    });
    expect(safeInvoke).toHaveBeenCalledWith("device_automation_perf_list_apps", {
      platform: "android",
      deviceId: "emulator-5554",
    });
    expect(apps).toEqual([{ packageName: "com.demo.app" }]);
  });

  it("startPerformanceCollection 调用 device_automation_perf_start", async () => {
    vi.mocked(safeInvoke).mockResolvedValueOnce({
      sessionId: "sess-2",
      startedAt: "2026-06-17T00:00:00.000Z",
    });
    const result = await startPerformanceCollection({
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["cpu"],
      intervalMs: 1000,
    });
    expect(safeInvoke).toHaveBeenCalledWith("device_automation_perf_start", {
      platform: "android",
      deviceId: "emulator-5554",
      packageName: "com.demo.app",
      metrics: ["cpu"],
      intervalMs: 1000,
    });
    expect(result.sessionId).toBe("sess-2");
  });

  it("stopPerformanceCollection 调用 device_automation_perf_stop", async () => {
    vi.mocked(safeInvoke).mockResolvedValueOnce({
      summary: { fps: { avg: 30, max: 60, min: 0 } },
      stoppedAt: "2026-06-17T00:01:00.000Z",
    });
    const result = await stopPerformanceCollection("sess-2");
    expect(safeInvoke).toHaveBeenCalledWith("device_automation_perf_stop", {
      sessionId: "sess-2",
    });
    expect(result.summary.fps?.avg).toBe(30);
  });

  it("listPerformanceTraceArtifacts 使用 perfMonitor/trace/list", async () => {
    const artifact: PerformanceTraceArtifact = {
      id: "trace-1",
      workspaceId: "ws-1",
      linkedSessionId: null,
      deviceId: "dev-1",
      devicePlatform: "android",
      packageName: "com.demo.app",
      presetId: "scroll_jank",
      configJson: null,
      localPath: "/tmp/trace-1.perfetto-trace",
      remotePath: null,
      sizeBytes: 1024,
      durationMs: 5000,
      status: "ready",
      errorMessage: null,
      createdAt: "2026-06-17T00:00:00.000Z",
      stoppedAt: "2026-06-17T00:00:10.000Z",
    };
    const { client, request } = makeClient({ artifacts: [artifact] });
    const artifacts = await listPerformanceTraceArtifacts("ws-1", undefined, client);
    expect(request).toHaveBeenCalledWith("perfMonitor/trace/list", {
      workspaceId: "ws-1",
      limit: undefined,
      offset: undefined,
    });
    expect(artifacts).toEqual([artifact]);
  });

  it("savePerformanceTraceAnalysis 使用 perfMonitor/traceAnalysis/save", async () => {
    const analysis: PerformanceTraceAnalysis = {
      id: "analysis-1",
      artifactId: "trace-1",
      analysisType: "jank_summary",
      packageName: "com.demo.app",
      timeRangeJson: null,
      resultJson: '{"jankFrames":2}',
      status: "done",
      createdAt: "2026-06-17T00:00:00.000Z",
    };
    const { client, request } = makeClient({ id: "analysis-1" });
    const id = await savePerformanceTraceAnalysis(analysis, client);
    expect(request).toHaveBeenCalledWith("perfMonitor/traceAnalysis/save", {
      analysis,
    });
    expect(id).toBe("analysis-1");
  });

  it("analyzePerformanceTrace 调用 device_automation_perf_trace_analyze", async () => {
    vi.mocked(safeInvoke).mockResolvedValueOnce({
      result: { jankFrames: 3, p99FrameMs: 40 },
    });
    const response = await analyzePerformanceTrace({
      localPath: "/tmp/trace.perfetto-trace",
      analysisType: "jank_summary",
      packageName: "com.demo.app",
    });
    expect(safeInvoke).toHaveBeenCalledWith("device_automation_perf_trace_analyze", {
      localPath: "/tmp/trace.perfetto-trace",
      analysisType: "jank_summary",
      packageName: "com.demo.app",
    });
    expect(response.result.jankFrames).toBe(3);
  });

  it("listPerformanceTraceAnalyses 使用 perfMonitor/traceAnalysis/list", async () => {
    const { client, request } = makeClient({ analyses: [] });
    await listPerformanceTraceAnalyses("trace-1", { limit: 5 }, client);
    expect(request).toHaveBeenCalledWith("perfMonitor/traceAnalysis/list", {
      artifactId: "trace-1",
      limit: 5,
    });
  });

  it("deletePerformanceTraceLocalFile 调用 device_automation_perf_trace_delete_local", async () => {
    vi.mocked(safeInvoke).mockResolvedValueOnce({ deleted: true });
    const result = await deletePerformanceTraceLocalFile("/tmp/trace.perfetto-trace");
    expect(safeInvoke).toHaveBeenCalledWith("device_automation_perf_trace_delete_local", {
      localPath: "/tmp/trace.perfetto-trace",
    });
    expect(result.deleted).toBe(true);
  });
});
