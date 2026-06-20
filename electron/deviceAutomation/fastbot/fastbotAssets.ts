import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface FastbotAssetBundle {
  rootDir: string;
  monkeyqJar: string;
  frameworkJar: string;
  fastbotThirdpartJar: string;
  kea2ThirdpartJar: string;
  nativeLibs: {
    arm64: string;
    arm32: string;
    x86: string;
    x86_64: string;
  };
}

function bundleFromRoot(rootDir: string): FastbotAssetBundle | null {
  const monkeyqJar = path.join(rootDir, "monkeyq.jar");
  const frameworkJar = path.join(rootDir, "framework.jar");
  const fastbotThirdpartJar = path.join(rootDir, "fastbot-thirdpart.jar");
  const kea2ThirdpartJar = path.join(rootDir, "kea2-thirdpart.jar");
  const libsRoot = path.join(rootDir, "fastbot_libs");
  const arm64 = path.join(libsRoot, "arm64-v8a", "libfastbot_native.so");
  const arm32 = path.join(libsRoot, "armeabi-v7a", "libfastbot_native.so");
  const x86 = path.join(libsRoot, "x86", "libfastbot_native.so");
  const x86_64 = path.join(libsRoot, "x86_64", "libfastbot_native.so");
  const required = [
    monkeyqJar,
    frameworkJar,
    fastbotThirdpartJar,
    kea2ThirdpartJar,
    arm64,
    arm32,
    x86,
    x86_64,
  ];
  if (!required.every((p) => existsSync(p))) {
    return null;
  }
  return {
    rootDir,
    monkeyqJar,
    frameworkJar,
    fastbotThirdpartJar,
    kea2ThirdpartJar,
    nativeLibs: { arm64, arm32, x86, x86_64 },
  };
}

/** 解析 Fastbot 资源包路径（开发态 / 打包态 / 环境变量覆盖）。 */
export function resolveFastbotAssetBundle(
  cwd = process.cwd(),
  resourcesPath?: string,
): FastbotAssetBundle {
  const envRoot = process.env.DEVICE_AUTOMATION_FASTBOT_ASSETS?.trim();
  const baseResourcesPath =
    resourcesPath ??
    (typeof process.resourcesPath === "string" ? process.resourcesPath : undefined);

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoFromModuleCandidates = [
    path.resolve(moduleDir, "../../.."),
    path.resolve(moduleDir, "../.."),
  ];

  const candidates: string[] = [];
  if (envRoot) {
    candidates.push(path.resolve(envRoot));
  }
  if (baseResourcesPath) {
    candidates.push(path.join(baseResourcesPath, "device-automation", "fastbot"));
  }
  for (const repoRoot of repoFromModuleCandidates) {
    candidates.push(path.join(repoRoot, "resources", "device-automation", "fastbot"));
  }
  candidates.push(
    path.join(cwd, "resources", "device-automation", "fastbot"),
    path.join(cwd, "dist-electron", "device-automation", "fastbot"),
    path.join(moduleDir, "../../../resources/device-automation/fastbot"),
    path.join(moduleDir, "../../resources/device-automation/fastbot"),
  );

  for (const rootDir of candidates) {
    const bundle = bundleFromRoot(rootDir);
    if (bundle) {
      return bundle;
    }
  }

  throw new Error(
    "未找到 Fastbot 资源包（monkeyq.jar 等）。请将 Kea2 assets 复制到 resources/device-automation/fastbot/，" +
      "或设置 DEVICE_AUTOMATION_FASTBOT_ASSETS 指向资源目录。",
  );
}
