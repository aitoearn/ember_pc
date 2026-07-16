/**
 * Fastbot 逐步 Monkey 运行时（对齐 Kea2 FastbotManager + 主循环 stepMonkey）。
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolveAdbPath } from "../deviceInventoryWatcher";
import { resolveFastbotAssetBundle } from "./fastbotAssets";
import {
  buildFastbotShellArgs,
  buildFastbotShellCommand,
  pushFastbotAssets,
  resolveFastbotNativeLibDir,
  type FastbotAgentKind,
} from "./fastbotPush";
import { FastbotU2Session } from "./fastbotU2Session";
import { prepareActListRemotePaths } from "./fastbotActLists";
import { FastbotHttpClient, FASTBOT_HTTP_LOCAL_PORT } from "./fastbotHttpClient";
import {
  FastbotResultSyncer,
  resolveMonkeySessionLocalDir,
} from "./fastbotResultSyncer";
import type { ExploreConfig, ExploreRule } from "../../../src/features/device-automation/explore/types";
import {
  listFailedExploreChecks,
  runExploreRuleChecks,
} from "../../../src/features/device-automation/explore/exploreRuleEngine";
import { runKea2UiDumpHeuristics } from "../../../src/features/device-automation/explore/domain/uiDumpHeuristics";
import type { MonkeyLogLine } from "../../../src/features/device-automation/monkey/types";
import {
  createFastbotLogParserState,
  parseFastbotProcessLine,
  type FastbotLogParserState,
} from "./fastbotLogParser";

export const FASTBOT_DEFAULT_DEVICE_OUTPUT_ROOT = "/sdcard/.ember-fastbot";

export interface FastbotRunnerParams {
  deviceId: string;
  packageName: string;
  sessionId: string;
  maxSteps: number;
  throttleMs: number;
  runningMinutes: number;
  fastbotAgent?: FastbotAgentKind;
  profilePeriod?: number;
  takeScreenshots?: boolean;
  deviceOutputRoot?: string;
  /** 工作区探索规则（property / invariant）。 */
  exploreRules?: ExploreRule[];
  /** 启用 Kea2 内置 UI 启发式（空树 / 无文案 / RN 空白页）。 */
  kea2BuiltinInvariants?: boolean;
  exploreConfig?: ExploreConfig;
  /** 本地结果根目录（userData/device-automation/monkey-results）。 */
  monkeyResultsRoot?: string;
  onLogLine: (line: MonkeyLogLine) => void;
  onStepsCount: (count: number) => void;
}

export interface FastbotRunnerHandle {
  child: ChildProcessWithoutNullStreams;
  http: FastbotHttpClient;
  u2Session?: FastbotU2Session;
  stopRequested: boolean;
  stepsCount: number;
  eventsInjected?: number;
  crashDetected: boolean;
  anrDetected: boolean;
  logicViolationCount: number;
  logParserState: FastbotLogParserState;
  deviceOutputDir?: string;
  localOutputDir?: string;
  resultSyncer?: FastbotResultSyncer;
}

function spawnFastbotShell(
  deviceId: string,
  shellArgs: string[],
): ChildProcessWithoutNullStreams {
  const adbPath = resolveAdbPath(process.env) ?? "adb";
  const nativeLibDir = resolveFastbotNativeLibDir(deviceId);
  const command = buildFastbotShellCommand(shellArgs, nativeLibDir);
  return spawn(adbPath, ["-s", deviceId, "shell", "sh", "-c", command], {
    stdio: "pipe",
    shell: false,
  });
}

function syncHandleFromLogState(handle: FastbotRunnerHandle): void {
  handle.crashDetected = handle.logParserState.crashDetected;
  handle.anrDetected = handle.logParserState.anrDetected;
}

function emitExploreFailures(
  failed: Array<{
    kind: string;
    ruleName: string;
    reason?: string;
    state: string;
    startStepsCount: number;
  }>,
  handle: FastbotRunnerHandle,
  params: FastbotRunnerParams,
): void {
  for (const failedResult of failed) {
    params.onLogLine({
      ts: Date.now(),
      type: failedResult.kind === "invariant" ? "error" : "crash",
      message: `[${failedResult.kind}] ${failedResult.ruleName}：${failedResult.reason ?? failedResult.state}`,
    });
    handle.logicViolationCount += 1;
    try {
      void handle.http.logScript({
        propName: failedResult.ruleName,
        startStepsCount: failedResult.startStepsCount,
        kind: failedResult.kind as "invariant" | "property",
        state: failedResult.state as "fail" | "error",
      });
    } catch {
      // Fastbot 可能已退出
    }
  }
  if (failed.some((item) => item.kind === "invariant")) {
    handle.crashDetected = true;
  }
}

export function startFastbotService(
  params: FastbotRunnerParams,
): FastbotRunnerHandle {
  const bundle = resolveFastbotAssetBundle();
  pushFastbotAssets(params.deviceId, bundle);

  const deviceOutputRoot =
    params.deviceOutputRoot?.trim() || FASTBOT_DEFAULT_DEVICE_OUTPUT_ROOT;
  const fastbotAgent = params.fastbotAgent ?? "double-sarsa";
  const exploreConfig = params.exploreConfig;
  const actPaths = exploreConfig
    ? prepareActListRemotePaths(
        params.deviceId,
        exploreConfig.actWhitelist,
        exploreConfig.actBlacklist,
      )
    : {};
  const shellArgs = buildFastbotShellArgs({
    packageName: params.packageName,
    logStamp: params.sessionId.replace(/-/g, "").slice(0, 16),
    runningMinutes: params.runningMinutes,
    throttleMs: params.throttleMs,
    fastbotAgent,
    deviceOutputRoot,
    profilePeriod: params.profilePeriod,
    actWhitelistFile: actPaths.actWhitelistFile,
    actBlacklistFile: actPaths.actBlacklistFile,
  });

  const child = spawnFastbotShell(params.deviceId, shellArgs);
  const http = new FastbotHttpClient(params.deviceId, FASTBOT_HTTP_LOCAL_PORT);
  try {
    http.setupForward();
  } catch (forwardError) {
    const message =
      forwardError instanceof Error ? forwardError.message : String(forwardError);
    params.onLogLine({
      ts: Date.now(),
      type: "error",
      message,
    });
    throw forwardError;
  }

  const handle: FastbotRunnerHandle = {
    child,
    http,
    stopRequested: false,
    stepsCount: 0,
    crashDetected: false,
    anrDetected: false,
    logicViolationCount: 0,
    logParserState: createFastbotLogParserState(),
    localOutputDir:
      params.monkeyResultsRoot
        ? resolveMonkeySessionLocalDir(params.monkeyResultsRoot, params.sessionId)
        : undefined,
  };

  const onData = (chunk: Buffer | string) => {
    const text = chunk.toString();
    for (const part of text.split(/\r?\n/)) {
      const line = part.trim();
      if (!line) {
        continue;
      }
      const prevCrashCount = handle.logParserState.crashCount;
      const prevAnrCount = handle.logParserState.anrCount;
      parseFastbotProcessLine(part, handle.logParserState, params.onLogLine);
      syncHandleFromLogState(handle);
      const emittedStructured =
        handle.logParserState.crashCount > prevCrashCount ||
        handle.logParserState.anrCount > prevAnrCount ||
        line.includes("Internal error") ||
        line.includes("App appears");
      if (!emittedStructured) {
        params.onLogLine({ ts: Date.now(), type: "log", message: line });
      }
    }
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  params.onLogLine({
    ts: Date.now(),
    type: "log",
    message: `Fastbot 服务已启动（agent=${fastbotAgent}，HTTP 本机端口=${FASTBOT_HTTP_LOCAL_PORT}，maxStep=${params.maxSteps}）`,
  });

  return handle;
}

export async function runFastbotStepLoop(
  params: FastbotRunnerParams,
  handle: FastbotRunnerHandle,
): Promise<void> {
  const deviceOutputRoot =
    params.deviceOutputRoot?.trim() || FASTBOT_DEFAULT_DEVICE_OUTPUT_ROOT;

  try {
    params.onLogLine({
      ts: Date.now(),
      type: "log",
      message: "正在连接 Fastbot HTTP 服务（/ping）…",
    });
    await handle.http.waitForPing();
    handle.deviceOutputDir = await handle.http.init({
      takeScreenshots: params.takeScreenshots ?? false,
      preFailureScreenshots: 0,
      postFailureScreenshots: 0,
      logStamp: params.sessionId.replace(/-/g, "").slice(0, 16),
      deviceOutputRoot,
    });
    params.onLogLine({
      ts: Date.now(),
      type: "log",
      message: `Fastbot 已初始化，输出目录：${handle.deviceOutputDir}`,
    });

    if (handle.localOutputDir && handle.deviceOutputDir) {
      handle.resultSyncer = new FastbotResultSyncer({
        deviceId: params.deviceId,
        deviceOutputDir: handle.deviceOutputDir,
        localOutputDir: handle.localOutputDir,
        cleanupDeviceAfterPull: true,
      });
    }

    const profilePeriod = Math.max(0, Math.floor(params.profilePeriod ?? 0));
    const exploreRules = params.exploreRules ?? [];
    const kea2BuiltinInvariants = params.kea2BuiltinInvariants !== false;
    const exploreConfig = params.exploreConfig;
    const blockWidgets = exploreConfig?.blockWidgetXpaths ?? [];
    const blockTrees = exploreConfig?.blockTreeXpaths ?? [];

    while (
      !handle.stopRequested &&
      handle.stepsCount < params.maxSteps
    ) {
      const stepIndex = handle.stepsCount;
      const xml = await handle.http.stepMonkey({
        steps_count: stepIndex,
        block_widgets: blockWidgets,
        block_trees: blockTrees,
      });
      handle.stepsCount += 1;
      handle.eventsInjected = handle.stepsCount;
      params.onStepsCount(handle.stepsCount);
      params.onLogLine({
        ts: Date.now(),
        type: "progress",
        message: `Fastbot 步 #${handle.stepsCount}（UI 树 ${xml.length} 字符）`,
        eventsInjected: handle.stepsCount,
      });

      if (xml.trim()) {
        const heuristicFailed =
          kea2BuiltinInvariants
            ? runKea2UiDumpHeuristics(xml, handle.stepsCount)
            : [];
        if (heuristicFailed.length > 0) {
          emitExploreFailures(heuristicFailed, handle, params);
        }

        if (exploreRules.length > 0) {
          const checkResults = runExploreRuleChecks(
            xml,
            exploreRules,
            handle.stepsCount,
          );
          const failed = listFailedExploreChecks(checkResults);
          if (failed.length > 0) {
            emitExploreFailures(failed, handle, params);
          }
        }
      } else if (kea2BuiltinInvariants) {
        const emptyFailed = runKea2UiDumpHeuristics("", handle.stepsCount);
        if (emptyFailed.length > 0) {
          emitExploreFailures(emptyFailed, handle, params);
        }
        params.onLogLine({
          ts: Date.now(),
          type: "log",
          message: "本步 UI 树为空，已跳过",
        });
      }

      if (!xml.trim() && !kea2BuiltinInvariants) {
        params.onLogLine({
          ts: Date.now(),
          type: "log",
          message: "本步 UI 树为空，已跳过",
        });
      }
      const throttle = Math.max(0, Math.floor(params.throttleMs));
      if (throttle > 0) {
        await new Promise((resolve) => setTimeout(resolve, throttle));
      }

      if (
        profilePeriod > 0 &&
        handle.stepsCount > 0 &&
        handle.stepsCount % profilePeriod === 0 &&
        handle.resultSyncer
      ) {
        try {
          handle.resultSyncer.sync();
          params.onLogLine({
            ts: Date.now(),
            type: "log",
            message: `已同步 Fastbot 结果到本地（第 ${handle.stepsCount} 步，profile-period=${profilePeriod}）`,
          });
        } catch (syncError) {
          params.onLogLine({
            ts: Date.now(),
            type: "error",
            message:
              syncError instanceof Error
                ? syncError.message
                : String(syncError),
          });
        }
      }
    }

    params.onLogLine({
      ts: Date.now(),
      type: "log",
      message: `Fastbot 步进循环结束（共 ${handle.stepsCount} 步）`,
      eventsInjected: handle.stepsCount,
    });
  } catch (error) {
    params.onLogLine({
      ts: Date.now(),
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function stopFastbotService(handle: FastbotRunnerHandle): Promise<void> {
  handle.stopRequested = true;
  try {
    await handle.http.stopMonkey();
  } catch {
    // 服务可能已退出
  }
  if (handle.resultSyncer) {
    try {
      await handle.resultSyncer.close();
    } catch (syncError) {
      console.error(
        "Fastbot 结果同步失败:",
        syncError instanceof Error ? syncError.message : syncError,
      );
    }
  }
  handle.http.removeForward();
  handle.u2Session?.stop();
  handle.child.kill("SIGTERM");
}
