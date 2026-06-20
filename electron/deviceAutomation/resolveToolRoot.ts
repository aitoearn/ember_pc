import { existsSync } from "node:fs";
import path from "node:path";
import { app } from "../electronRuntime";

/**
 * 解析外部工具仓库根目录：优先环境变量，再尝试与 Ember 仓库同级的 sibling 目录。
 */
export function resolveToolRoot(params: {
  envVar: string;
  siblingDirName: string;
  packagedSubdir?: string;
}): string | null {
  const configured = process.env[params.envVar]?.trim();
  if (configured && existsSync(configured)) {
    return configured;
  }

  const appPath = app.getAppPath();
  const resourcesPath =
    typeof process.resourcesPath === "string" ? process.resourcesPath : null;
  const candidates = [
    ...(resourcesPath
      ? [
          path.join(
            resourcesPath,
            params.packagedSubdir ?? params.siblingDirName,
          ),
        ]
      : []),
    path.resolve(appPath, "..", params.siblingDirName),
    path.resolve(appPath, "../..", params.siblingDirName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}
