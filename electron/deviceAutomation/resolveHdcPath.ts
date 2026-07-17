import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveToolRoot } from "./resolveToolRoot";

export type ResolveHdcPathOptions = {
  exists?: (filePath: string) => boolean;
  /** 测试用：覆盖 process.platform。 */
  platform?: NodeJS.Platform;
};

function hdcExecName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "hdc.exe" : "hdc";
}

function pathEnvKey(platform: NodeJS.Platform): "Path" | "PATH" {
  return platform === "win32" ? "Path" : "PATH";
}

function sdkToolchainCandidates(
  sdkRoot: string,
  execName: string,
): string[] {
  return [
    path.join(sdkRoot, "default", "openharmony", "toolchains", execName),
    path.join(sdkRoot, "openharmony", "toolchains", execName),
    path.join(sdkRoot, "toolchains", execName),
  ];
}

/**
 * 解析鸿蒙 hdc 可执行文件路径。
 * 优先级：DEVICE_AUTOMATION_HDC → DEVICE_AUTOMATION_HDC_DIR / 打包资源 →
 * DevEco / OHOS SDK 环境变量 → 常见本机安装路径 → PATH 中的 hdc。
 */
export function resolveHdcPath(
  env: NodeJS.ProcessEnv = process.env,
  options: ResolveHdcPathOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const exists = options.exists ?? existsSync;
  const execName = hdcExecName(platform);

  const configured = env.DEVICE_AUTOMATION_HDC?.trim();
  if (configured) {
    return configured;
  }

  const configuredDir = env.DEVICE_AUTOMATION_HDC_DIR?.trim();
  if (configuredDir) {
    const fromDir = path.join(configuredDir, execName);
    if (exists(fromDir)) {
      return fromDir;
    }
  }

  let packagedHdcRoot: string | null = null;
  try {
    packagedHdcRoot = resolveToolRoot({
      envVar: "DEVICE_AUTOMATION_HDC_DIR",
      siblingDirName: "hdc",
      packagedSubdir: path.join("device-automation", "hdc"),
    });
  } catch {
    // 非 Electron 测试环境可能没有 app，跳过打包/sibling 探测
    packagedHdcRoot = null;
  }
  if (packagedHdcRoot) {
    const candidate = path.join(packagedHdcRoot, execName);
    if (exists(candidate)) {
      return candidate;
    }
  }

  const sdkRoots = [
    env.DEVECO_SDK_HOME,
    env.HOS_SDK_HOME,
    env.OHOS_SDK_HOME,
    env.OHOS_BASE_SDK_HOME,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  for (const sdkRoot of sdkRoots) {
    for (const candidate of sdkToolchainCandidates(sdkRoot, execName)) {
      if (exists(candidate)) {
        return candidate;
      }
    }
  }

  if (platform === "darwin") {
    const home = env.HOME?.trim();
    const macDirs = [
      "/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains",
      ...(home
        ? [path.join(home, "Library/Huawei/Sdk/default/openharmony/toolchains")]
        : []),
    ];
    for (const dir of macDirs) {
      const candidate = path.join(dir, execName);
      if (exists(candidate)) {
        return candidate;
      }
    }
  }

  return execName;
}

export type HdcExecSync = (
  deviceId: string,
  args: string[],
) => { stdout: string; stderr: string; exitCode: number | null };

const HDC_EXEC_TIMEOUT_MS = 15_000;

/**
 * 同步执行 `hdc [-t <deviceId>] <args...>`（deviceId 为空时省略 `-t`）。
 *
 * hdc 是 HarmonyOS 设备连接工具（对齐 Android 的 adb）；此处统一封装，
 * 供设备枚举与 SmartPerf 性能采集复用。
 */
export function execHdcSync(
  deviceId: string,
  args: string[],
): { stdout: string; stderr: string; exitCode: number | null } {
  const hdcPath = resolveHdcPath(process.env);
  const fullArgs = deviceId.trim() ? ["-t", deviceId, ...args] : args;
  const result = spawnSync(hdcPath, fullArgs, {
    encoding: "utf8",
    shell: false,
    timeout: HDC_EXEC_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
    exitCode: result.status,
  };
}

/**
 * 把已解析的 hdc 路径写入环境变量，便于子进程（如 agent-device）复用。
 * 绝对路径时会将其所在目录前置到 PATH。
 */
export function applyHdcPathToEnv(
  env: NodeJS.ProcessEnv,
  hdcPath: string = resolveHdcPath(env),
  options: Pick<ResolveHdcPathOptions, "platform"> = {},
): NodeJS.ProcessEnv {
  const platform = options.platform ?? process.platform;
  const next: NodeJS.ProcessEnv = {
    ...env,
    DEVICE_AUTOMATION_HDC: hdcPath,
  };

  if (!path.isAbsolute(hdcPath)) {
    return next;
  }

  const hdcDir = path.dirname(hdcPath);
  const key = pathEnvKey(platform);
  const current = next[key] ?? next.PATH ?? "";
  const parts = current
    .split(path.delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts[0] === hdcDir) {
    return next;
  }
  next[key] = [hdcDir, ...parts.filter((part) => part !== hdcDir)].join(
    path.delimiter,
  );
  return next;
}
