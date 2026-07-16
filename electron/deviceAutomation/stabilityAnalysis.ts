import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DeviceAutomationStabilityAnalysisEventPayload } from "../../src/features/device-automation/stability/events";
import type { StabilityAnalysisEventLine } from "../../src/features/device-automation/stability/types";
import { resolveToolRoot } from "./resolveToolRoot";
import {
  getStabilityLlmConfigPath,
  validateStabilityLlmConfigForFullAnalysis,
} from "./stabilityLlmConfig";

export type StabilityAnalysisEventEmitter = (
  payload: DeviceAutomationStabilityAnalysisEventPayload,
) => void;

export type StabilityAnalysisToolStatus = {
  available: boolean;
  toolRoot?: string;
  cliEntry?: string;
  pythonCommand?: string;
  error?: string;
};

export type StabilityAnalysisStartParams = {
  crashLogPath?: string;
  crashLogContent?: string;
  libraryDir?: string;
  codeRoots?: string[];
  scope?: "full" | "parse_stack_only";
  promptMode?: "analysis";
  outputFormat?: "markdown" | "json" | "text";
};

export type StabilityAnalysisStartResult = {
  runId: string;
  startedAt: string;
  toolRoot: string;
  reportRoot: string;
};

export type StabilityAnalysisStopResult = {
  runId: string;
  status: "canceled";
  stoppedAt: string;
};

export type StabilityAnalysisStatusResult = {
  activeRunId?: string;
  startedAt?: string;
};

type ActiveStabilityRun = {
  runId: string;
  startedAt: string;
  child: ChildProcessWithoutNullStreams;
  tempCrashLogPath?: string;
  cliReportsRoot: string;
};

const STABILITY_TOOL_ENV = "STABILITY_ANALYSIS_AGENT_ROOT";
const STABILITY_TOOL_SIBLING = "stability-analysis-agent";

let resultsRoot: string | null = null;
let eventEmitter: StabilityAnalysisEventEmitter | null = null;
let activeRun: ActiveStabilityRun | null = null;
let spawnImpl = spawn;

export function setStabilityAnalysisResultsRoot(root: string | null): void {
  resultsRoot = root?.trim() || null;
}

export function setStabilityAnalysisEventEmitter(
  emitter: StabilityAnalysisEventEmitter | null,
): void {
  eventEmitter = emitter;
}

export function setStabilityAnalysisSpawnForTests(impl: typeof spawn | null): void {
  spawnImpl = impl ?? spawn;
}

export function resetStabilityAnalysisForTests(): void {
  if (activeRun) {
    activeRun.child.kill("SIGTERM");
    if (activeRun.tempCrashLogPath) {
      try {
        unlinkSync(activeRun.tempCrashLogPath);
      } catch {
        // 忽略
      }
    }
  }
  activeRun = null;
  eventEmitter = null;
  resultsRoot = null;
  spawnImpl = spawn;
}

function ensureResultsRoot(): string {
  if (!resultsRoot) {
    throw new Error("稳定性分析结果目录未初始化");
  }
  mkdirSync(resultsRoot, { recursive: true });
  return resultsRoot;
}

function resolveStabilityToolRoot(): string | null {
  return resolveToolRoot({
    envVar: STABILITY_TOOL_ENV,
    siblingDirName: STABILITY_TOOL_SIBLING,
  });
}

function resolvePythonCommand(toolRoot: string): string {
  const fromEnv = process.env.DEVICE_AUTOMATION_PYTHON?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const venvCandidates =
    process.platform === "win32"
      ? [
          path.join(toolRoot, ".venv", "Scripts", "python.exe"),
          path.join(toolRoot, ".venv", "bin", "python3"),
        ]
      : [
          path.join(toolRoot, ".venv", "bin", "python3"),
          path.join(toolRoot, ".venv", "bin", "python"),
        ];

  for (const candidate of venvCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return process.platform === "win32" ? "python" : "python3";
}

export function getStabilityAnalysisToolStatus(): StabilityAnalysisToolStatus {
  const toolRoot = resolveStabilityToolRoot();
  if (!toolRoot) {
    return {
      available: false,
      error: `未找到 sa-agent：请设置 ${STABILITY_TOOL_ENV} 或将 ${STABILITY_TOOL_SIBLING} 放在 Ember 同级目录`,
    };
  }

  const cliEntry = path.join(toolRoot, "cli", "main.py");
  if (!existsSync(cliEntry)) {
    return {
      available: false,
      toolRoot,
      cliEntry,
      error: `sa-agent CLI 不存在：${cliEntry}`,
    };
  }

  return {
    available: true,
    toolRoot,
    cliEntry,
    pythonCommand: resolvePythonCommand(toolRoot),
  };
}

function emitLine(runId: string, line: StabilityAnalysisEventLine): void {
  eventEmitter?.({ runId, line });
}

function resolveCliReportsRoot(workRoot: string): string {
  return path.join(workRoot, "cli_reports");
}

function resolveCrashLogPath(params: StabilityAnalysisStartParams): {
  crashLogPath: string;
  tempPath?: string;
} {
  const direct = params.crashLogPath?.trim();
  if (direct) {
    if (!existsSync(direct)) {
      throw new Error(`崩溃日志不存在：${direct}`);
    }
    return { crashLogPath: direct };
  }

  const content = params.crashLogContent?.trim();
  if (!content) {
    throw new Error("crashLogPath 与 crashLogContent 至少提供一个");
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "ember-stability-crash-"));
  const tempPath = path.join(tempDir, "crash.log");
  writeFileSync(tempPath, content, "utf8");
  return { crashLogPath: tempPath, tempPath };
}

/** 构建 sa-agent CLI 参数（可单测）。 */
export function buildStabilityAnalysisCliArgs(params: {
  cliEntry: string;
  crashLogPath: string;
  libraryDir?: string;
  codeRoots?: string[];
  scope?: "full" | "parse_stack_only";
  promptMode?: "analysis" | "fix";
  outputFormat?: "markdown" | "json" | "text";
  configPath?: string;
}): string[] {
  const scope = params.scope ?? "full";
  const promptMode = params.promptMode ?? "analysis";
  const outputFormat = params.outputFormat ?? "markdown";

  const args = [
    "-u",
    params.cliEntry,
    "--crash-log",
    params.crashLogPath,
    "--scope",
    scope,
    "--prompt-mode",
    promptMode,
    "--engine",
    "direct",
    "--no-interactive",
    "--no-apply-ai-fixes",
    "--output-format",
    outputFormat,
  ];

  const libraryDir = params.libraryDir?.trim();
  if (libraryDir) {
    args.push("--library-dir", libraryDir);
  }

  for (const codeRoot of params.codeRoots ?? []) {
    const trimmed = codeRoot?.trim();
    if (trimmed) {
      args.push("--code-root", trimmed);
    }
  }

  const configPath = params.configPath?.trim();
  if (configPath) {
    args.push("--config", configPath);
  }

  return args;
}

function findNewestReportDir(
  cliReportsRoot: string,
  startedAtMs: number,
): string | undefined {
  if (!existsSync(cliReportsRoot)) {
    return undefined;
  }

  let newest: { path: string; mtimeMs: number } | undefined;
  for (const entry of readdirSync(cliReportsRoot)) {
    const fullPath = path.join(cliReportsRoot, entry);
    try {
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        continue;
      }
      if (stat.mtimeMs + 1000 < startedAtMs) {
        continue;
      }
      if (!newest || stat.mtimeMs > newest.mtimeMs) {
        newest = { path: fullPath, mtimeMs: stat.mtimeMs };
      }
    } catch {
      continue;
    }
  }
  return newest?.path;
}

function resolvePrimaryArtifactPath(reportDir: string): string | undefined {
  const finalOutput = path.join(reportDir, "final_output.md");
  if (existsSync(finalOutput)) {
    return finalOutput;
  }
  const roundArtifact = path.join(reportDir, "round_0", "06_ai_gen_res.md");
  if (existsSync(roundArtifact)) {
    return roundArtifact;
  }
  return undefined;
}

export function startStabilityAnalysis(
  params: StabilityAnalysisStartParams,
): StabilityAnalysisStartResult {
  if (activeRun) {
    throw new Error("已有稳定性分析任务在运行，请先取消");
  }

  const promptMode = params.promptMode ?? "analysis";
  if (promptMode !== "analysis") {
    throw new Error("P1 仅支持 promptMode=analysis，已拒绝 fix 模式");
  }

  const toolStatus = getStabilityAnalysisToolStatus();
  if (!toolStatus.available || !toolStatus.toolRoot || !toolStatus.cliEntry) {
    throw new Error(toolStatus.error ?? "sa-agent 不可用");
  }

  const scope = params.scope ?? "full";
  if (scope === "full" && !validateStabilityLlmConfigForFullAnalysis()) {
    throw new Error("scope=full 需要有效 LLM 配置，请先在面板配置 API Key");
  }

  const workRoot = ensureResultsRoot();
  const cliReportsRoot = resolveCliReportsRoot(workRoot);
  mkdirSync(cliReportsRoot, { recursive: true });

  const { crashLogPath, tempPath } = resolveCrashLogPath(params);
  const configPath = existsSync(getStabilityLlmConfigPath())
    ? getStabilityLlmConfigPath()
    : undefined;

  const pythonCommand =
    toolStatus.pythonCommand ?? resolvePythonCommand(toolStatus.toolRoot);
  const argv = buildStabilityAnalysisCliArgs({
    cliEntry: toolStatus.cliEntry,
    crashLogPath,
    libraryDir: params.libraryDir,
    codeRoots: params.codeRoots,
    scope,
    promptMode,
    outputFormat: params.outputFormat,
    configPath,
  });

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  console.log("[device-automation] 启动稳定性分析：", runId);

  const child = spawnImpl(pythonCommand, argv, {
    cwd: workRoot,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      STABILITY_AGENT_CONFIG_DIR: workRoot,
      STABILITY_AGENT_REPORT_DIR: cliReportsRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  activeRun = {
    runId,
    startedAt,
    child,
    tempCrashLogPath: tempPath,
    cliReportsRoot,
  };

  const forwardStream = (
    stream: NodeJS.ReadableStream | null,
    type: StabilityAnalysisEventLine["type"],
  ) => {
    let buffer = "";
    stream?.on("data", (chunk: Buffer | string) => {
      buffer += String(chunk);
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const message = part.trimEnd();
        if (!message) {
          continue;
        }
        emitLine(runId, { ts: Date.now(), type, message });
      }
    });
  };

  forwardStream(child.stdout, "log");
  forwardStream(child.stderr, "stderr");

  child.on("error", (error) => {
    emitLine(runId, {
      ts: Date.now(),
      type: "error",
      message: error.message,
    });
    cleanupActiveRun(tempPath);
  });

  child.on("close", (code) => {
    if (activeRun?.runId !== runId) {
      return;
    }

    const reportDir = findNewestReportDir(cliReportsRoot, startedAtMs);
    const primaryArtifactPath = reportDir
      ? resolvePrimaryArtifactPath(reportDir)
      : undefined;

    if (code === 0) {
      emitLine(runId, {
        ts: Date.now(),
        type: "done",
        message: "稳定性分析完成",
        reportDir,
        primaryArtifactPath,
      });
    } else {
      emitLine(runId, {
        ts: Date.now(),
        type: "error",
        message: `sa-agent 退出码 ${code ?? "unknown"}`,
        reportDir,
        primaryArtifactPath,
      });
    }

    cleanupActiveRun(tempPath);
  });

  return {
    runId,
    startedAt,
    toolRoot: toolStatus.toolRoot,
    reportRoot: cliReportsRoot,
  };
}

function cleanupActiveRun(tempCrashLogPath?: string): void {
  if (tempCrashLogPath) {
    try {
      unlinkSync(tempCrashLogPath);
    } catch {
      // 忽略
    }
  }
  activeRun = null;
}

export function cancelStabilityAnalysis(
  runId: string,
): StabilityAnalysisStopResult {
  const normalizedRunId = runId?.trim();
  if (!normalizedRunId || !activeRun || activeRun.runId !== normalizedRunId) {
    throw new Error("未找到匹配的稳定性分析任务");
  }

  const session = activeRun;
  session.child.kill("SIGTERM");
  setTimeout(() => {
    if (activeRun?.runId === normalizedRunId) {
      session.child.kill("SIGKILL");
    }
  }, 3000);

  emitLine(normalizedRunId, {
    ts: Date.now(),
    type: "error",
    message: "稳定性分析已取消",
  });
  cleanupActiveRun(session.tempCrashLogPath);

  return {
    runId: normalizedRunId,
    status: "canceled",
    stoppedAt: new Date().toISOString(),
  };
}

export function getStabilityAnalysisStatus(): StabilityAnalysisStatusResult {
  if (!activeRun) {
    return {};
  }
  return {
    activeRunId: activeRun.runId,
    startedAt: activeRun.startedAt,
  };
}
