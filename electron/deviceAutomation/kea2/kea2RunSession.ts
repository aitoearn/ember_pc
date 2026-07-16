/**
 * Kea2 run 会话：spawn `python -m kea2 run` 并映射为 Monkey 事件流。
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { ExploreConfig, ExploreRule } from "../../../src/features/device-automation/explore/types";
import type { MonkeyLogLine } from "../../../src/features/device-automation/monkey/types";
import {
  createFastbotLogParserState,
  parseFastbotProcessLine,
  type FastbotLogParserState,
} from "../fastbot/fastbotLogParser";
import { generateFastbotBugReport } from "../fastbot/fastbotBugReport";
import {
  buildKea2PythonEnv,
  buildKea2RunCliArgs,
  getKea2ToolStatus,
  resolveKea2PythonCommand,
  resolveKea2ToolRoot,
  runKea2ReportGeneration,
} from "./kea2Tool";
import {
  ensureKea2WorkspaceProject,
  findKea2ResultDir,
  resolveKea2SessionOutputDir,
  syncExploreConfigFiles,
  writeKea2GeneratedPropertyScript,
} from "./kea2Workspace";

export type Kea2RunParams = {
  sessionId: string;
  workspaceId: string;
  deviceId: string;
  packageName: string;
  runningMinutes: number;
  maxStep: number;
  throttleMs: number;
  profilePeriod: number;
  takeScreenshots: boolean;
  fastbotAgent?: "double-sarsa" | "sarsa";
  kea2PropertyScript?: string;
  exploreRules?: ExploreRule[];
  exploreConfig?: ExploreConfig;
  onLogLine: (line: MonkeyLogLine) => void;
};

export type Kea2RunHandle = {
  child: ChildProcessWithoutNullStreams;
  projectDir: string;
  sessionOutputDir: string;
  logParserState: FastbotLogParserState;
  crashDetected: boolean;
  anrDetected: boolean;
  stopRequested: boolean;
};

export type Kea2FinalizeResult = {
  localResultDir?: string;
  bugReportPath?: string;
  stepsLogPath?: string;
  stepsSummary?: ReturnType<typeof generateFastbotBugReport>["summary"];
  detectionSummary?: {
    logicViolationCount: number;
    widgetCoverageCount: number;
    crashDump?: {
      crashDumpPath?: string;
      crashEventCount: number;
      anrEventCount: number;
    };
  };
};

let kea2WorkspacesRoot: string | null = null;

export function setKea2WorkspacesRoot(root: string | null): void {
  kea2WorkspacesRoot = root?.trim() || null;
}

export function prepareKea2Run(params: Kea2RunParams): {
  projectDir: string;
  sessionOutputDir: string;
  propertyScript?: string;
} {
  if (!kea2WorkspacesRoot) {
    throw new Error("Kea2 工作区根目录未初始化");
  }
  const status = getKea2ToolStatus();
  if (!status.available || !status.toolRoot) {
    throw new Error(status.error ?? "Kea2 不可用");
  }

  const { projectDir } = ensureKea2WorkspaceProject(
    kea2WorkspacesRoot,
    params.workspaceId,
  );
  if (params.exploreConfig) {
    syncExploreConfigFiles(projectDir, params.exploreConfig);
  }
  writeKea2GeneratedPropertyScript(projectDir, params.exploreRules ?? []);

  const sessionOutputDir = resolveKea2SessionOutputDir(projectDir, params.sessionId);
  return {
    projectDir,
    sessionOutputDir,
    propertyScript: params.kea2PropertyScript?.trim() || undefined,
  };
}

export function startKea2Run(
  params: Kea2RunParams,
  prepared: ReturnType<typeof prepareKea2Run>,
): Kea2RunHandle {
  const toolRoot = resolveKea2ToolRoot();
  if (!toolRoot) {
    throw new Error("Kea2 工具根目录不可用");
  }
  const python = resolveKea2PythonCommand(toolRoot);
  const logStamp = params.sessionId.replace(/-/g, "").slice(0, 16);
  const cliArgs = buildKea2RunCliArgs({
    deviceId: params.deviceId,
    packageName: params.packageName,
    outputDir: prepared.sessionOutputDir,
    logStamp,
    runningMinutes: params.runningMinutes,
    maxStep: params.maxStep,
    throttleMs: params.throttleMs,
    profilePeriod: params.profilePeriod,
    takeScreenshots: params.takeScreenshots,
    fastbotAgent: params.fastbotAgent,
    kea2PropertyScript: prepared.propertyScript,
  });

  params.onLogLine({
    ts: Date.now(),
    type: "log",
    message: `Kea2 启动：${prepared.projectDir}（propertytest → ${prepared.propertyScript ?? "discover properties/*.py"}）`,
  });

  const child = spawn(python, ["-m", "kea2", ...cliArgs], {
    cwd: prepared.projectDir,
    env: buildKea2PythonEnv(toolRoot),
    stdio: "pipe",
    shell: false,
  });

  const logParserState = createFastbotLogParserState();
  const handle: Kea2RunHandle = {
    child,
    projectDir: prepared.projectDir,
    sessionOutputDir: prepared.sessionOutputDir,
    logParserState,
    crashDetected: false,
    anrDetected: false,
    stopRequested: false,
  };

  const onData = (chunk: Buffer | string) => {
    const text = chunk.toString();
    for (const part of text.split(/\r?\n/)) {
      const line = part.trim();
      if (!line) {
        continue;
      }
      const prevCrash = logParserState.crashCount;
      const prevAnr = logParserState.anrCount;
      parseFastbotProcessLine(part, logParserState, params.onLogLine);
      handle.crashDetected = logParserState.crashDetected;
      handle.anrDetected = logParserState.anrDetected;
      const structured =
        logParserState.crashCount > prevCrash ||
        logParserState.anrCount > prevAnr ||
        line.includes("Internal error") ||
        line.includes("Property Violation") ||
        line.includes("App appears");
      if (!structured) {
        params.onLogLine({ ts: Date.now(), type: "log", message: line });
      }
      if (/property violation|invariant|assertionerror/i.test(line)) {
        params.onLogLine({ ts: Date.now(), type: "error", message: line });
      }
    }
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  return handle;
}

export function stopKea2Run(handle: Kea2RunHandle): void {
  handle.stopRequested = true;
  handle.child.kill("SIGTERM");
}

export function finalizeKea2Run(
  handle: Kea2RunHandle,
  meta: {
    sessionId: string;
    packageName: string;
    startedAt: string;
    stoppedAt: string;
    conclusion: string;
    exitCode: number | null;
  },
): Kea2FinalizeResult {
  const toolRoot = resolveKea2ToolRoot();
  const resultDir = findKea2ResultDir(handle.sessionOutputDir) ?? handle.sessionOutputDir;
  if (toolRoot) {
    const reportResult = runKea2ReportGeneration(toolRoot, resultDir);
    if (!reportResult.ok) {
      console.error("Kea2 报告生成失败:", reportResult.message);
    }
  }

  let bugReportPath: string | undefined;
  let stepsLogPath: string | undefined;
  let stepsSummary: Kea2FinalizeResult["stepsSummary"];
  let detectionSummary: Kea2FinalizeResult["detectionSummary"];

  try {
    const report = generateFastbotBugReport(resultDir, {
      sessionId: meta.sessionId,
      packageName: meta.packageName,
      startedAt: meta.startedAt,
      stoppedAt: meta.stoppedAt,
      conclusion: meta.conclusion,
      logicViolationCount: meta.exitCode === 1 ? 1 : 0,
    });
    bugReportPath = report.reportPath;
    stepsLogPath = report.stepsLogPath ?? undefined;
    stepsSummary = report.summary;
    detectionSummary = {
      logicViolationCount: meta.exitCode === 1 || meta.exitCode === 3 ? 1 : 0,
      widgetCoverageCount: report.widgetCoverage.uniqueWidgetCount,
      crashDump: {
        crashDumpPath: report.crashDumpPath ?? undefined,
        crashEventCount: report.crashEvents.length,
        anrEventCount: report.anrEvents.length,
      },
    };
  } catch (error) {
    console.error(
      "Kea2 结果汇总失败:",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    localResultDir: resultDir,
    bugReportPath,
    stepsLogPath,
    stepsSummary,
    detectionSummary,
  };
}

export function mapKea2ExitCodeToConclusion(
  exitCode: number | null,
  handle: Pick<Kea2RunHandle, "crashDetected" | "anrDetected" | "stopRequested">,
): import("../../../src/features/device-automation/monkey/types").MonkeySessionConclusion {
  if (handle.stopRequested) {
    return "stopped";
  }
  if (exitCode === 2 || exitCode === 3 || handle.anrDetected) {
    return "anr";
  }
  if (exitCode === 1 || exitCode === 3 || handle.crashDetected) {
    return "crashed";
  }
  if (exitCode !== 0 && exitCode !== null) {
    return "error";
  }
  return "completed";
}
