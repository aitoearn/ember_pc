/**
 * Android Monkey 稳定性测试：System Monkey + Fastbot 逐步模式（Kea2 对齐）。
 */

import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { deviceActivityLock } from "./deviceActivityLock";
import { resolveAdbPath } from "./deviceInventoryWatcher";
import {
  runFastbotStepLoop,
  startFastbotService,
  stopFastbotService,
  type FastbotRunnerHandle,
} from "./fastbot/fastbotRunner";
import { FastbotU2Session } from "./fastbot/fastbotU2Session";
import { generateFastbotBugReport } from "./fastbot/fastbotBugReport";
import type { FastbotAgentKind } from "./fastbot/fastbotPush";
import type { DeviceAutomationMonkeyEventPayload } from "../../src/features/device-automation/monkey/events";
import type {
  MonkeySessionConclusion,
  MonkeyLogLine,
  MonkeyEngineMode,
} from "../../src/features/device-automation/monkey/types";
import {
  MONKEY_DEFAULT_EVENT_COUNT,
  MONKEY_DEFAULT_RUNNING_MINUTES,
  MONKEY_DEFAULT_THROTTLE_MS,
} from "../../src/features/device-automation/monkey/constants/defaults";

export type MonkeyEventEmitter = (
  payload: DeviceAutomationMonkeyEventPayload,
) => void;

export type MonkeyStartParams = {
  deviceId: string;
  packageName: string;
  mode?: MonkeyEngineMode;
  eventCount?: number;
  throttleMs?: number;
  seed?: number;
  runningMinutes?: number;
  ignoreCrashes?: boolean;
  ignoreTimeouts?: boolean;
  profilePeriod?: number;
  takeScreenshots?: boolean;
  fastbotAgent?: FastbotAgentKind;
  deviceOutputRoot?: string;
  exploreRules?: import("../../src/features/device-automation/explore/types").ExploreRule[];
  exploreConfig?: import("../../src/features/device-automation/explore/types").ExploreConfig;
};

export type MonkeyStartResult = {
  sessionId: string;
  startedAt: string;
  mode: MonkeyEngineMode;
};

export type MonkeyStopResult = {
  conclusion: MonkeySessionConclusion;
  stoppedAt: string;
  eventsInjected?: number;
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: {
    totalLines: number;
    monkeyStepCount: number;
    scriptInfoCount: number;
    crashCount: number;
    anrCount: number;
    killAppsCount: number;
    lastMonkeyStep?: number;
  };
};

export type MonkeyStatusResult = {
  activeSessionId?: string;
  deviceId?: string;
  packageName?: string;
  startedAt?: string;
  mode?: MonkeyEngineMode;
};

type ActiveMonkeySession = {
  sessionId: string;
  deviceId: string;
  packageName: string;
  mode: MonkeyEngineMode;
  startedAt: string;
  durationTimer: ReturnType<typeof setTimeout> | null;
  eventsInjected?: number;
  crashDetected: boolean;
  anrDetected: boolean;
  stopRequested: boolean;
  systemChild?: ChildProcessWithoutNullStreams;
  fastbot?: FastbotRunnerHandle;
};

let eventEmitter: MonkeyEventEmitter | null = null;
let activeSession: ActiveMonkeySession | null = null;
let monkeyResultsRoot: string | null = null;

export function setMonkeyResultsRoot(root: string | null): void {
  monkeyResultsRoot = root?.trim() || null;
}

export function setMonkeyEventEmitter(emitter: MonkeyEventEmitter | null): void {
  eventEmitter = emitter;
}

export function resetMonkeyTestForTests(): void {
  if (activeSession) {
    void stopMonkeyTest({ sessionId: activeSession.sessionId });
  }
  activeSession = null;
  eventEmitter = null;
  monkeyResultsRoot = null;
  deviceActivityLock.clearForTests();
}

/** 拼装 adb shell monkey 参数（可单测）。 */
export function buildMonkeyShellArgs(params: MonkeyStartParams): string[] {
  const pkg = params.packageName.trim();
  if (!pkg) {
    throw new Error("packageName 不能为空");
  }
  const eventCount = Math.max(
    1,
    Math.floor(params.eventCount ?? MONKEY_DEFAULT_EVENT_COUNT),
  );
  const throttle = Math.max(
    0,
    Math.floor(params.throttleMs ?? MONKEY_DEFAULT_THROTTLE_MS),
  );
  const ignoreCrashes = params.ignoreCrashes ?? true;
  const ignoreTimeouts = params.ignoreTimeouts ?? true;

  const args: string[] = ["monkey", "-p", pkg, "--throttle", String(throttle)];
  if (params.seed !== undefined && Number.isFinite(params.seed)) {
    args.push("-s", String(Math.floor(params.seed)));
  }
  if (ignoreCrashes) {
    args.push("--ignore-crashes");
  }
  if (ignoreTimeouts) {
    args.push("--ignore-timeouts");
  }
  args.push("--ignore-security-exceptions", "--monitor-native-crashes");
  args.push("-v", "-v", "-v", String(eventCount));
  return args;
}

function emitLine(sessionId: string, line: MonkeyLogLine): void {
  eventEmitter?.({ sessionId, line });
}

function spawnAdbShell(
  deviceId: string,
  shellArgs: string[],
): ChildProcessWithoutNullStreams {
  const adbPath = resolveAdbPath(process.env) ?? "adb";
  return spawn(adbPath, ["-s", deviceId, "shell", ...shellArgs], {
    stdio: "pipe",
    shell: false,
  });
}

function killExistingMonkey(deviceId: string): void {
  spawnAdbShell(deviceId, ["killall", "com.android.commands.monkey"]).on(
    "error",
    () => {
      // 忽略
    },
  );
}

function parseSystemMonkeyLine(
  sessionId: string,
  raw: string,
  session: ActiveMonkeySession,
): void {
  const line = raw.trim();
  if (!line) {
    return;
  }
  const upper = line.toUpperCase();
  if (upper.includes("ANR")) {
    session.anrDetected = true;
    emitLine(sessionId, { ts: Date.now(), type: "anr", message: line });
    return;
  }
  if (upper.includes("CRASH")) {
    session.crashDetected = true;
    emitLine(sessionId, { ts: Date.now(), type: "crash", message: line });
    return;
  }
  const injectedMatch = line.match(/Events injected:\s*(\d+)/i);
  if (injectedMatch) {
    const count = Number(injectedMatch[1]);
    session.eventsInjected = count;
    emitLine(sessionId, {
      ts: Date.now(),
      type: "progress",
      message: line,
      eventsInjected: count,
    });
    return;
  }
  emitLine(sessionId, { ts: Date.now(), type: "log", message: line });
}

function finalizeSession(
  session: ActiveMonkeySession,
  conclusion: MonkeySessionConclusion,
): MonkeyStopResult {
  if (activeSession?.sessionId !== session.sessionId) {
    return {
      conclusion,
      stoppedAt: new Date().toISOString(),
      eventsInjected: session.eventsInjected,
    };
  }
  const stoppedAt = new Date().toISOString();
  let localResultDir: string | undefined;
  let bugReportPath: string | undefined;
  let stepsLogPath: string | undefined;
  let stepsSummary: MonkeyStopResult["stepsSummary"];

  if (session.mode === "fastbot" && session.fastbot?.localOutputDir) {
    try {
      const report = generateFastbotBugReport(session.fastbot.localOutputDir, {
        sessionId: session.sessionId,
        packageName: session.packageName,
        startedAt: session.startedAt,
        stoppedAt,
        conclusion,
      });
      localResultDir = session.fastbot.localOutputDir;
      bugReportPath = report.reportPath;
      stepsLogPath = report.stepsLogPath ?? undefined;
      stepsSummary = report.summary;
    } catch (error) {
      console.error(
        "生成 Fastbot 报告失败:",
        error instanceof Error ? error.message : error,
      );
      localResultDir = session.fastbot.localOutputDir;
    }
  }

  emitLine(session.sessionId, {
    ts: Date.now(),
    type: "done",
    message: `Monkey 结束：${conclusion}`,
    eventsInjected: session.eventsInjected,
    localResultDir,
    bugReportPath,
    stepsLogPath,
    stepsSummary,
  });
  deviceActivityLock.release(session.deviceId, session.sessionId);
  activeSession = null;
  return {
    conclusion,
    stoppedAt,
    eventsInjected: session.eventsInjected,
    localResultDir,
    bugReportPath,
    stepsLogPath,
    stepsSummary,
  };
}

function scheduleDurationTimeout(
  session: ActiveMonkeySession,
  runningMinutes: number,
): void {
  session.durationTimer = setTimeout(() => {
    if (activeSession?.sessionId !== session.sessionId) {
      return;
    }
    session.stopRequested = true;
    if (session.mode === "system" && session.systemChild) {
      session.systemChild.kill("SIGTERM");
    }
    if (session.mode === "fastbot" && session.fastbot) {
      void stopFastbotService(session.fastbot).finally(() => {
        finalizeSession(session, "timeout");
      });
    }
  }, runningMinutes * 60 * 1000);
}

function startSystemMonkey(
  session: ActiveMonkeySession,
  params: MonkeyStartParams,
): void {
  killExistingMonkey(session.deviceId);
  const shellArgs = buildMonkeyShellArgs(params);
  const child = spawnAdbShell(session.deviceId, shellArgs);
  session.systemChild = child;

  const onData = (chunk: Buffer | string) => {
    const text = chunk.toString();
    for (const part of text.split(/\r?\n/)) {
      parseSystemMonkeyLine(session.sessionId, part, session);
    }
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  child.on("error", (error) => {
    emitLine(session.sessionId, {
      ts: Date.now(),
      type: "error",
      message: error.message,
    });
    if (session.durationTimer) {
      clearTimeout(session.durationTimer);
    }
    finalizeSession(session, "error");
  });

  child.on("close", (code) => {
    if (session.durationTimer) {
      clearTimeout(session.durationTimer);
    }
    let conclusion: MonkeySessionConclusion = "completed";
    if (session.stopRequested) {
      conclusion = "stopped";
    } else if (session.anrDetected) {
      conclusion = "anr";
    } else if (session.crashDetected) {
      conclusion = "crashed";
    } else if (code !== 0 && code !== null) {
      conclusion = "error";
    }
    finalizeSession(session, conclusion);
  });

  emitLine(session.sessionId, {
    ts: Date.now(),
    type: "log",
    message: `System Monkey：${params.packageName}（事件 ${shellArgs[shellArgs.length - 1]}）`,
  });
}

function startFastbotMonkey(
  session: ActiveMonkeySession,
  params: MonkeyStartParams,
): void {
  killExistingMonkey(session.deviceId);
  const maxSteps = Math.max(
    1,
    Math.floor(params.eventCount ?? MONKEY_DEFAULT_EVENT_COUNT),
  );
  const runnerParams = {
    deviceId: session.deviceId,
    packageName: session.packageName,
    sessionId: session.sessionId,
    maxSteps,
    throttleMs: params.throttleMs ?? MONKEY_DEFAULT_THROTTLE_MS,
    runningMinutes:
      params.runningMinutes ?? MONKEY_DEFAULT_RUNNING_MINUTES,
    fastbotAgent: params.fastbotAgent,
    profilePeriod: params.profilePeriod,
    takeScreenshots: params.takeScreenshots,
    deviceOutputRoot: params.deviceOutputRoot,
    monkeyResultsRoot: monkeyResultsRoot ?? undefined,
    exploreRules: params.exploreRules,
    exploreConfig: params.exploreConfig,
    onLogLine: (line: MonkeyLogLine) => {
      if (line.type === "crash") {
        session.crashDetected = true;
      }
      if (line.type === "anr") {
        session.anrDetected = true;
      }
      emitLine(session.sessionId, line);
    },
    onStepsCount: (count: number) => {
      session.eventsInjected = count;
    },
  };

  void (async () => {
    const u2Session = new FastbotU2Session();
    try {
      await u2Session.start(session.deviceId, (message) => {
        runnerParams.onLogLine({
          ts: Date.now(),
          type: "log",
          message,
        });
      });
    } catch (error) {
      if (session.durationTimer) {
        clearTimeout(session.durationTimer);
      }
      runnerParams.onLogLine({
        ts: Date.now(),
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      u2Session.stop();
      if (activeSession?.sessionId === session.sessionId) {
        finalizeSession(session, "error");
      }
      return;
    }

    if (activeSession?.sessionId !== session.sessionId) {
      u2Session.stop();
      return;
    }

    const handle = startFastbotService(runnerParams);
    handle.u2Session = u2Session;
    session.fastbot = handle;

    handle.child.on("close", (code) => {
      if (session.durationTimer) {
        clearTimeout(session.durationTimer);
      }
      if (activeSession?.sessionId !== session.sessionId) {
        return;
      }
      const steps = session.eventsInjected ?? 0;
      let conclusion: MonkeySessionConclusion = "completed";
      if (session.stopRequested) {
        conclusion = steps > 0 ? "completed" : "stopped";
      } else if (session.anrDetected) {
        conclusion = "anr";
      } else if (session.crashDetected) {
        conclusion = "crashed";
      } else if (steps === 0) {
        conclusion = "error";
        emitLine(session.sessionId, {
          ts: Date.now(),
          type: "error",
          message: `Fastbot 进程过早退出（exit=${code ?? "null"}），未执行任何步进。请查看上方 Fastbot 日志行。`,
        });
      } else if (code !== 0 && code !== null) {
        conclusion = "error";
      }
      finalizeSession(session, conclusion);
    });

    try {
      await runFastbotStepLoop(runnerParams, handle);
    } catch {
      // 错误已通过 onLogLine 上报
    } finally {
      if (activeSession?.sessionId === session.sessionId && !session.stopRequested) {
        session.stopRequested = true;
        await stopFastbotService(handle);
      }
    }
  })();
}

export function startMonkeyTest(params: MonkeyStartParams): MonkeyStartResult {
  const deviceId = params.deviceId?.trim();
  const packageName = params.packageName?.trim();
  if (!deviceId || !packageName) {
    throw new Error("deviceId 与 packageName 不能为空");
  }
  if (activeSession) {
    throw new Error("已有 Monkey 任务在运行，请先停止");
  }
  const mode: MonkeyEngineMode = params.mode ?? "fastbot";
  const sessionId = randomUUID();
  const lock = deviceActivityLock.tryAcquire(deviceId, "monkey_test", sessionId);
  if (!lock.ok) {
    throw new Error(lock.message);
  }

  const startedAt = new Date().toISOString();
  const runningMinutes = Math.max(
    1,
    Math.floor(params.runningMinutes ?? MONKEY_DEFAULT_RUNNING_MINUTES),
  );

  const session: ActiveMonkeySession = {
    sessionId,
    deviceId,
    packageName,
    mode,
    startedAt,
    durationTimer: null,
    crashDetected: false,
    anrDetected: false,
    stopRequested: false,
  };
  activeSession = session;
  scheduleDurationTimeout(session, runningMinutes);

  if (mode === "fastbot") {
    startFastbotMonkey(session, params);
  } else {
    startSystemMonkey(session, params);
  }

  return { sessionId, startedAt, mode };
}

export function stopMonkeyTest(params: { sessionId: string }): MonkeyStopResult {
  const sessionId = params.sessionId?.trim();
  if (!sessionId || !activeSession || activeSession.sessionId !== sessionId) {
    return {
      conclusion: "stopped",
      stoppedAt: new Date().toISOString(),
    };
  }
  const session = activeSession;
  session.stopRequested = true;
  if (session.durationTimer) {
    clearTimeout(session.durationTimer);
  }

  if (session.mode === "fastbot" && session.fastbot) {
    void stopFastbotService(session.fastbot);
    return {
      conclusion: "stopped",
      stoppedAt: new Date().toISOString(),
      eventsInjected: session.eventsInjected,
    };
  }

  killExistingMonkey(session.deviceId);
  session.systemChild?.kill("SIGTERM");
  return {
    conclusion: "stopped",
    stoppedAt: new Date().toISOString(),
    eventsInjected: session.eventsInjected,
  };
}

export function getMonkeyStatus(): MonkeyStatusResult {
  if (!activeSession) {
    return {};
  }
  return {
    activeSessionId: activeSession.sessionId,
    deviceId: activeSession.deviceId,
    packageName: activeSession.packageName,
    startedAt: activeSession.startedAt,
    mode: activeSession.mode,
  };
}
