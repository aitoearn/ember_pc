import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCRCPY_SERVER_DEFAULT_RELATIVE_PATH =
  "resources/device-automation/scrcpy.jar";

const REPO_ROOT_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** 按优先级列出 scrcpy server jar 候选路径（开发态与打包态）。 */
export function listScrcpyServerPathCandidates(
  cwd = process.cwd(),
  resourcesPath?: string,
): string[] {
  const envPath = process.env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH?.trim();
  const baseResourcesPath =
    resourcesPath ??
    (typeof process.resourcesPath === "string"
      ? process.resourcesPath
      : undefined);

  const candidates: string[] = [];
  if (envPath) {
    candidates.push(path.resolve(envPath));
  }
  if (baseResourcesPath) {
    candidates.push(path.join(baseResourcesPath, "device-automation", "scrcpy.jar"));
  }
  candidates.push(
    path.join(cwd, "resources", "device-automation", "scrcpy.jar"),
    path.join(cwd, ".tmp", "device-automation", "scrcpy.jar"),
    path.join(cwd, "dist-electron", "device-automation", "scrcpy.jar"),
    path.join(cwd, "electron", "deviceAutomation", "scrcpy.jar"),
  );
  // electron:dev 主进程 cwd 常为 .ember/electron-dev-host，cwd 候选均不存在时回退到仓库根。
  candidates.push(
    path.join(REPO_ROOT_FROM_MODULE, "resources", "device-automation", "scrcpy.jar"),
  );
  return [...new Set(candidates)];
}

export function resolveScrcpyServerPath(
  cwd = process.cwd(),
  resourcesPath?: string,
): string {
  const match = listScrcpyServerPathCandidates(cwd, resourcesPath).find((candidate) =>
    existsSync(candidate),
  );
  if (match) {
    return match;
  }
  throw new Error(buildScrcpyServerMissingMessage(cwd));
}

export function buildScrcpyServerMissingMessage(cwd = process.cwd()): string {
  return (
    "未找到 scrcpy.jar，无法启动 native 投屏。请执行 npm run electron:download:scrcpy-server，" +
    `或设置 DEVICE_AUTOMATION_SCRCPY_SERVER_PATH 指向有效 jar（期望默认路径：${path.join(cwd, SCRCPY_SERVER_DEFAULT_RELATIVE_PATH)}）`
  );
}
