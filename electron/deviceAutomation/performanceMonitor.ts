import { randomUUID } from "node:crypto";
import { execAdbSync } from "./scrcpyAdbFastPath";
import { execHdcSync, type HdcExecSync } from "./resolveHdcPath";
import type { DeviceAutomationPerfFramePayload } from "../../src/features/device-automation/performance/events";
import type {
  PerfMetricId,
  PerfMetricKey,
  PerfMetricSummaryMap,
} from "../../src/features/device-automation/performance/types";
import {
  appendPerfFrame,
  computeAllPerfSummaries,
  createEmptyPerfBuffers,
  type PerfSeriesBuffers,
} from "../../src/features/device-automation/performance/domain/perfBuffer";
import {
  collectAndroidPerfSample,
  parseThirdPartyPackages,
  type AdbExecSync,
} from "./performanceMonitor/androidCollectors";
import {
  collectHarmonyPerfSample,
  listHarmonyPackages,
} from "./performanceMonitor/harmonyCollectors";

const ALLOWED_INTERVALS_MS = [500, 1000, 2000, 5000] as const;
const MAX_EMPTY_FRAME_STREAK = 10;

/** P1 支持采集的平台。iOS 暂不支持；Perfetto trace（P2）仍限 Android。 */
export type PerfCollectionPlatform = "android" | "harmony";

export type PerfFrameEmitter = (payload: DeviceAutomationPerfFramePayload) => void;

export type PerfStartParams = {
  platform: PerfCollectionPlatform;
  deviceId: string;
  packageName: string;
  metrics: PerfMetricId[];
  intervalMs: number;
};

/** 归一化平台标识：ohos → harmony。 */
function normalizePerfPlatform(platform: string): PerfCollectionPlatform | "unsupported" {
  const value = platform.trim().toLowerCase();
  if (value === "android") {
    return "android";
  }
  if (value === "harmony" || value === "ohos") {
    return "harmony";
  }
  return "unsupported";
}

export type PerfStartResult = {
  sessionId: string;
  startedAt: string;
};

export type PerfStopResult = {
  summary: PerfMetricSummaryMap;
  stoppedAt: string;
  failed?: boolean;
};

export type PerfStatusResult = {
  activeSessionId?: string;
  deviceId?: string;
  packageName?: string;
  metrics?: PerfMetricId[];
};

type ActivePerfSession = {
  sessionId: string;
  platform: PerfCollectionPlatform;
  deviceId: string;
  packageName: string;
  metrics: Set<PerfMetricId>;
  intervalMs: number;
  startedAt: string;
  buffers: PerfSeriesBuffers;
  procStatPrevious: ReturnType<typeof collectAndroidPerfSample>["procStatPrevious"];
  gfxFramesPrevious: ReturnType<typeof collectAndroidPerfSample>["gfxFramesPrevious"];
  emptyFrameStreak: number;
  timer: ReturnType<typeof setTimeout> | null;
  tickInFlight: boolean;
  stopRequested: boolean;
  failed: boolean;
};

let frameEmitter: PerfFrameEmitter | null = null;
let activeSession: ActivePerfSession | null = null;
let adbExec: AdbExecSync = execAdbSync;
let hdcExec: HdcExecSync = execHdcSync;

export function setPerfFrameEmitter(emitter: PerfFrameEmitter | null): void {
  frameEmitter = emitter;
}

export function setPerfAdbExecForTests(exec: AdbExecSync | null): void {
  adbExec = exec ?? execAdbSync;
}

export function setPerfHdcExecForTests(exec: HdcExecSync | null): void {
  hdcExec = exec ?? execHdcSync;
}

export function resetPerformanceMonitorForTests(): void {
  if (activeSession?.timer) {
    clearTimeout(activeSession.timer);
  }
  activeSession = null;
  frameEmitter = null;
  adbExec = execAdbSync;
  hdcExec = execHdcSync;
}

export function listPerfApps(params: {
  platform: string;
  deviceId: string;
}): { apps: { packageName: string; label?: string }[] } {
  const platform = normalizePerfPlatform(params.platform);
  if (platform === "unsupported") {
    return { apps: [] };
  }

  if (platform === "harmony") {
    const packages = listHarmonyPackages({
      execHdcSync: hdcExec,
      deviceId: params.deviceId,
    });
    if (packages.length === 0) {
      console.warn("[perf-monitor] 获取 HarmonyOS 应用列表为空或失败");
    }
    return {
      apps: packages.map((packageName: string) => ({ packageName })),
    };
  }

  const result = adbExec(params.deviceId, ["shell", "pm", "list", "packages", "-3"]);
  if (result.exitCode !== 0) {
    console.warn(
      "[perf-monitor] 获取第三方应用列表失败",
      result.stderr.trim() || result.stdout.trim(),
    );
    return { apps: [] };
  }
  return {
    apps: parseThirdPartyPackages(result.stdout).map((packageName: string) => ({
      packageName,
    })),
  };
}

export function startPerfCollection(params: PerfStartParams): PerfStartResult {
  const platform = normalizePerfPlatform(params.platform);
  if (platform === "unsupported") {
    throw new Error("当前仅支持 Android 与 HarmonyOS 设备性能采集");
  }
  if (!params.deviceId.trim()) {
    throw new Error("deviceId 不能为空");
  }
  if (!params.packageName.trim()) {
    throw new Error("packageName 不能为空");
  }
  if (params.metrics.length === 0) {
    throw new Error("至少选择一项采集指标");
  }
  if (!ALLOWED_INTERVALS_MS.includes(params.intervalMs as (typeof ALLOWED_INTERVALS_MS)[number])) {
    throw new Error("采集间隔非法");
  }

  if (activeSession) {
    stopPerfCollection(activeSession.sessionId);
  }

  // Android 需要在采集前重置 gfxinfo 帧计数以便差分；HarmonyOS 由 SP_daemon 直接给出 FPS，无需重置。
  if (platform === "android") {
    adbExec(params.deviceId, [
      "shell",
      "dumpsys",
      "gfxinfo",
      params.packageName,
      "reset",
    ]);
  }

  const sessionId = randomUUID();
  const startedAt = new Date().toISOString();
  activeSession = {
    sessionId,
    platform,
    deviceId: params.deviceId,
    packageName: params.packageName,
    metrics: new Set(params.metrics),
    intervalMs: params.intervalMs,
    startedAt,
    buffers: createEmptyPerfBuffers(),
    procStatPrevious: null,
    gfxFramesPrevious: null,
    emptyFrameStreak: 0,
    timer: null,
    tickInFlight: false,
    stopRequested: false,
    failed: false,
  };

  scheduleNextTick(activeSession);
  console.info(
    `[perf-monitor] 已开始采集 session=${sessionId} device=${params.deviceId} pkg=${params.packageName}`,
  );
  return { sessionId, startedAt };
}

export function stopPerfCollection(sessionId: string): PerfStopResult {
  const session = requireActiveSession(sessionId);
  session.stopRequested = true;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }

  const stoppedAt = new Date().toISOString();
  const summary = computeAllPerfSummaries(session.buffers);
  const failed = session.failed;
  activeSession = null;

  console.info(`[perf-monitor] 已停止采集 session=${sessionId} failed=${failed}`);
  return { summary, stoppedAt, ...(failed ? { failed: true } : {}) };
}

export function getPerfStatus(): PerfStatusResult {
  if (!activeSession) {
    return {};
  }
  return {
    activeSessionId: activeSession.sessionId,
    deviceId: activeSession.deviceId,
    packageName: activeSession.packageName,
    metrics: [...activeSession.metrics],
  };
}

function requireActiveSession(sessionId: string): ActivePerfSession {
  if (!activeSession || activeSession.sessionId !== sessionId) {
    throw new Error(`未找到活跃采集会话: ${sessionId}`);
  }
  return activeSession;
}

function scheduleNextTick(session: ActivePerfSession): void {
  if (session.stopRequested) {
    return;
  }
  session.timer = setTimeout(() => {
    void runTick(session.sessionId);
  }, session.intervalMs);
}

async function runTick(sessionId: string): Promise<void> {
  const session = activeSession;
  if (!session || session.sessionId !== sessionId || session.stopRequested) {
    return;
  }
  if (session.tickInFlight) {
    scheduleNextTick(session);
    return;
  }

  session.tickInFlight = true;
  const started = Date.now();
  try {
    let sampleData: Partial<Record<PerfMetricKey, number>>;
    if (session.platform === "harmony") {
      const sample = collectHarmonyPerfSample({
        execHdcSync: hdcExec,
        deviceId: session.deviceId,
        packageName: session.packageName,
        metrics: session.metrics,
      });
      sampleData = sample.data;
    } else {
      const sample = collectAndroidPerfSample({
        execAdbSync: adbExec,
        deviceId: session.deviceId,
        packageName: session.packageName,
        metrics: session.metrics,
        intervalMs: session.intervalMs,
        procStatPrevious: session.procStatPrevious,
        gfxFramesPrevious: session.gfxFramesPrevious,
      });
      session.procStatPrevious = sample.procStatPrevious;
      session.gfxFramesPrevious = sample.gfxFramesPrevious;
      sampleData = sample.data;
    }

    const sample = { data: sampleData };
    const hasValidMetric = Object.values(sample.data).some(
      (value) => value !== undefined && Number.isFinite(value),
    );
    if (hasValidMetric) {
      session.emptyFrameStreak = 0;
      const ts = Date.now();
      session.buffers = appendPerfFrame(session.buffers, ts, sample.data);
      frameEmitter?.({
        sessionId: session.sessionId,
        ts,
        data: sample.data,
      });
    } else {
      session.emptyFrameStreak += 1;
      console.warn(
        `[perf-monitor] 本帧无有效数据 streak=${session.emptyFrameStreak} session=${sessionId}`,
      );
      if (session.emptyFrameStreak >= MAX_EMPTY_FRAME_STREAK) {
        session.failed = true;
        stopPerfCollection(sessionId);
        return;
      }
    }
  } catch (error) {
    session.emptyFrameStreak += 1;
    console.warn(`[perf-monitor] 采集 tick 失败 session=${sessionId}`, error);
    if (session.emptyFrameStreak >= MAX_EMPTY_FRAME_STREAK) {
      session.failed = true;
      stopPerfCollection(sessionId);
      return;
    }
  } finally {
    session.tickInFlight = false;
  }

  if (session.stopRequested || activeSession?.sessionId !== sessionId) {
    return;
  }

  const elapsed = Date.now() - started;
  const delay = Math.max(0, session.intervalMs - elapsed);
  session.timer = setTimeout(() => {
    void runTick(sessionId);
  }, delay);
}

export type { PerfMetricKey };
