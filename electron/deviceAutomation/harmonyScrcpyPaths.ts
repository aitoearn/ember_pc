import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const WRAPPER_JAR_NAME = "harmony-scrcpy-wrapper.jar";

/** 列出 hoscrcpy 资源目录候选（开发态 + 打包态）。 */
export function listHoscrcpyDirCandidates(
  cwd = process.cwd(),
  resourcesPath?: string,
): string[] {
  const envDir = process.env.DEVICE_AUTOMATION_HOSCRCPY_DIR?.trim();
  const baseResourcesPath =
    resourcesPath ??
    (typeof process.resourcesPath === "string" ? process.resourcesPath : undefined);

  const candidates: string[] = [];
  if (envDir) {
    candidates.push(path.resolve(envDir));
  }
  if (baseResourcesPath) {
    candidates.push(path.join(baseResourcesPath, "device-automation", "hoscrcpy"));
  }
  candidates.push(
    path.join(cwd, "resources", "device-automation", "hoscrcpy"),
    path.join(cwd, "dist-electron", "device-automation", "hoscrcpy"),
    path.join(REPO_ROOT_FROM_MODULE, "resources", "device-automation", "hoscrcpy"),
  );
  return [...new Set(candidates)];
}

function findSdkJarInDir(dir: string): string | null {
  if (!existsSync(dir)) {
    return null;
  }
  const jars = readdirSync(dir)
    .filter((name) => /^hos.*scrcpy.*\.jar$/i.test(name) && name !== WRAPPER_JAR_NAME)
    .sort();
  if (jars.length === 0) {
    return null;
  }
  return path.join(dir, jars[jars.length - 1]);
}

export type HoscrcpyJarPaths = {
  sdkJar: string;
  wrapperJar: string;
};

/** 解析 hoscrcpy SDK jar 与 wrapper jar；任一缺失则返回 null（鸿蒙投屏不可用）。 */
export function resolveHoscrcpyJarPaths(
  cwd = process.cwd(),
  resourcesPath?: string,
): HoscrcpyJarPaths | null {
  for (const dir of listHoscrcpyDirCandidates(cwd, resourcesPath)) {
    const sdkJar = findSdkJarInDir(dir);
    const wrapperJar = path.join(dir, WRAPPER_JAR_NAME);
    if (sdkJar && existsSync(wrapperJar)) {
      return { sdkJar, wrapperJar };
    }
  }
  return null;
}
