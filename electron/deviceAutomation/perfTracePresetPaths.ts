import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PerfTracePresetId } from "../../src/features/device-automation/performance/types";

const REPO_ROOT_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const PRESET_FILE_NAMES: Record<Exclude<PerfTracePresetId, "custom">, string> = {
  scroll_jank: "scroll_jank.txt",
  cold_start: "cold_start.txt",
  cpu_sched: "cpu_sched.txt",
};

/** 按优先级列出 Perfetto 文本预设目录候选路径（开发态、dist 与打包态）。 */
export function listPerfTracePresetDirCandidates(
  cwd = process.cwd(),
  resourcesPath?: string,
): string[] {
  const envDir = process.env.DEVICE_AUTOMATION_PERF_TRACE_PRESETS_DIR?.trim();
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const baseResourcesPath =
    resourcesPath ??
    (typeof process.resourcesPath === "string" ? process.resourcesPath : undefined);

  const candidates: string[] = [];
  if (envDir) {
    candidates.push(path.resolve(envDir));
  }
  if (baseResourcesPath) {
    candidates.push(
      path.join(baseResourcesPath, "device-automation", "perfTrace", "presets"),
    );
  }
  candidates.push(
    path.join(cwd, "dist-electron", "device-automation", "perfTrace", "presets"),
    path.join(cwd, "dist-electron", "main", "perfTrace", "presets"),
    path.join(moduleDir, "perfTrace", "presets"),
    moduleDir,
    path.join(REPO_ROOT_FROM_MODULE, "electron", "deviceAutomation", "perfTrace", "presets"),
    path.join(cwd, "electron", "deviceAutomation", "perfTrace", "presets"),
  );
  return [...new Set(candidates)];
}

export function resolvePerfTracePresetFilePath(
  presetId: Exclude<PerfTracePresetId, "custom">,
  cwd = process.cwd(),
  resourcesPath?: string,
): string {
  const fileName = PRESET_FILE_NAMES[presetId];
  const match = listPerfTracePresetDirCandidates(cwd, resourcesPath)
    .map((dir) => path.join(dir, fileName))
    .find((filePath) => existsSync(filePath));
  if (match) {
    return match;
  }
  throw new Error(buildPerfTracePresetMissingMessage(presetId, cwd));
}

export function buildPerfTracePresetMissingMessage(
  presetId: Exclude<PerfTracePresetId, "custom">,
  cwd = process.cwd(),
): string {
  const fileName = PRESET_FILE_NAMES[presetId];
  const searched = listPerfTracePresetDirCandidates(cwd).join("\n  - ");
  return (
    `未找到 Perfetto 预设 ${fileName}。请执行 npm run electron:build:host:dev 重新构建主进程，\n` +
    `或设置 DEVICE_AUTOMATION_PERF_TRACE_PRESETS_DIR 指向含 ${fileName} 的目录。\n` +
    `已搜索：\n  - ${searched}`
  );
}
