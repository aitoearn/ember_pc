/**
 * Kea2 工具根目录与 CLI 可用性解析。
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveToolRoot } from "../resolveToolRoot";
import { resolveFastbotPythonCommand } from "../fastbot/resolveFastbotPython";

export const KEA2_TOOL_ENV = "KEA2_ROOT";
export const KEA2_TOOL_SIBLING = "Kea2";
export const KEA2_TOOL_SIBLING_NESTED = path.join("testtool", "Kea2");

export type Kea2ToolStatus = {
  available: boolean;
  toolRoot?: string;
  pythonCommand?: string;
  kea2Module?: string;
  version?: string;
  error?: string;
};

export function resolveKea2ToolRoot(): string | null {
  const fromEnv = process.env[KEA2_TOOL_ENV]?.trim();
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const fromSibling = resolveToolRoot({
    envVar: KEA2_TOOL_ENV,
    siblingDirName: KEA2_TOOL_SIBLING,
  });
  if (fromSibling) {
    return fromSibling;
  }

  try {
    const { app } = require("../../electronRuntime") as typeof import("../../electronRuntime");
    const appPath = app.getAppPath();
    const nested = path.resolve(appPath, "..", KEA2_TOOL_SIBLING_NESTED);
    if (existsSync(nested)) {
      return nested;
    }
  } catch {
    // 测试环境无 Electron app
  }

  return null;
}

export function buildKea2PythonEnv(toolRoot: string): NodeJS.ProcessEnv {
  const existing = process.env.PYTHONPATH?.trim();
  const sep = path.delimiter;
  const merged = existing ? `${toolRoot}${sep}${existing}` : toolRoot;
  return {
    ...process.env,
    PYTHONPATH: merged,
  };
}

export function resolveKea2PythonCommand(_toolRoot?: string | null): string {
  return resolveFastbotPythonCommand();
}

/** 构建 `python -m kea2 run ...` 参数（不含 python 与 -m kea2）。 */
export function buildKea2RunCliArgs(params: {
  deviceId: string;
  packageName: string;
  outputDir: string;
  logStamp: string;
  runningMinutes: number;
  maxStep: number;
  throttleMs: number;
  profilePeriod: number;
  takeScreenshots: boolean;
  fastbotAgent?: "double-sarsa" | "sarsa";
  kea2PropertyScript?: string;
  kea2PropertyDiscover?: boolean;
}): string[] {
  const args = [
    "run",
    "-s",
    params.deviceId,
    "-p",
    params.packageName,
    "-o",
    params.outputDir,
    "--running-minutes",
    String(Math.max(1, params.runningMinutes)),
    "--max-step",
    String(Math.max(1, params.maxStep)),
    "--throttle",
    String(Math.max(0, params.throttleMs)),
    "--profile-period",
    String(Math.max(1, params.profilePeriod)),
    "--log-stamp",
    params.logStamp,
    "--device-output-root",
    "/sdcard/.kea2",
    "--fastbot-agent",
    params.fastbotAgent ?? "double-sarsa",
  ];

  if (params.takeScreenshots) {
    args.push("--take-screenshots");
  }

  const script = params.kea2PropertyScript?.trim();
  if (script) {
    args.push("propertytest", script);
  } else if (params.kea2PropertyDiscover !== false) {
    args.push("propertytest", "discover", "-s", "properties", "-p", "*.py");
  } else {
    args.push("propertytest", "quicktest.py");
  }

  return args;
}

export function buildKea2ReportCliArgs(resultDir: string): string[] {
  return ["report", "-p", resultDir];
}

export function getKea2ToolStatus(): Kea2ToolStatus {
  const toolRoot = resolveKea2ToolRoot();
  if (!toolRoot) {
    return {
      available: false,
      error: `未找到 Kea2：请设置 ${KEA2_TOOL_ENV}，或将 Kea2 放在 Ember 同级目录 / testtool/Kea2`,
    };
  }

  const kea2Package = path.join(toolRoot, "kea2");
  if (!existsSync(kea2Package)) {
    return {
      available: false,
      toolRoot,
      error: `Kea2 Python 包不存在：${kea2Package}`,
    };
  }

  const python = resolveKea2PythonCommand(toolRoot);
  const probe = spawnSync(
    python,
    ["-c", "import kea2; from kea2.version_manager import get_cur_version; print(get_cur_version())"],
    {
      env: buildKea2PythonEnv(toolRoot),
      encoding: "utf8",
      timeout: 30_000,
    },
  );

  if (probe.status !== 0) {
    return {
      available: false,
      toolRoot,
      pythonCommand: python,
      error:
        `Kea2 Python 依赖不可用：${probe.stderr || probe.stdout || "import kea2 失败"}。` +
        "请执行 pip install -e <Kea2根目录> 或 npm run electron:ensure:fastbot-python",
    };
  }

  return {
    available: true,
    toolRoot,
    pythonCommand: python,
    kea2Module: kea2Package,
    version: probe.stdout.trim(),
  };
}

export function runKea2ReportGeneration(
  toolRoot: string,
  resultDir: string,
): { ok: boolean; message: string } {
  const python = resolveKea2PythonCommand(toolRoot);
  const report = spawnSync(
    python,
    ["-m", "kea2", ...buildKea2ReportCliArgs(resultDir)],
    {
      cwd: path.dirname(resultDir),
      env: buildKea2PythonEnv(toolRoot),
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  if (report.status !== 0) {
    return {
      ok: false,
      message: report.stderr || report.stdout || `Kea2 report 失败 exit=${report.status}`,
    };
  }
  return { ok: true, message: report.stdout.trim() };
}
