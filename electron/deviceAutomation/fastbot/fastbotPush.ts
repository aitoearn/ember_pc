import { execAdbSync } from "../scrcpyAdbFastPath";
import type { FastbotAssetBundle } from "./fastbotAssets";

const ABI_LIB_DIR: Record<string, string> = {
  "arm64-v8a": "arm64-v8a",
  "armeabi-v7a": "armeabi-v7a",
  "x86": "x86",
  "x86_64": "x86_64",
};

/** 按设备 ABI 解析 Fastbot native so 目录（/data/local/tmp/<abi>）。 */
export function resolveFastbotNativeLibDir(deviceId: string): string {
  const result = execAdbSync(deviceId, ["shell", "getprop", "ro.product.cpu.abi"]);
  const abi = result.stdout.trim().split(/\s+/)[0] ?? "";
  const dirName = ABI_LIB_DIR[abi] ?? "arm64-v8a";
  return `/data/local/tmp/${dirName}`;
}

/** 拼装带 LD_LIBRARY_PATH 的 shell 命令（单条 sh -c）。 */
export function buildFastbotShellCommand(
  shellArgs: string[],
  nativeLibDir: string,
): string {
  const libDir = nativeLibDir.trim() || "/data/local/tmp/arm64-v8a";
  return `export LD_LIBRARY_PATH=${libDir}; ${shellArgs.join(" ")}`;
}

export function pushFastbotAssets(
  deviceId: string,
  bundle: FastbotAssetBundle,
): void {
  const push = (local: string, remote: string) => {
    const result = execAdbSync(deviceId, ["push", local, remote]);
    if (result.exitCode !== 0) {
      throw new Error(
        `推送 Fastbot 资源失败：${remote} — ${result.stderr || result.stdout}`,
      );
    }
  };

  push(bundle.monkeyqJar, "/sdcard/monkeyq.jar");
  push(bundle.frameworkJar, "/sdcard/framework.jar");
  push(bundle.fastbotThirdpartJar, "/sdcard/fastbot-thirdpart.jar");
  push(bundle.kea2ThirdpartJar, "/sdcard/kea2-thirdpart.jar");
  push(bundle.nativeLibs.arm64, "/data/local/tmp/arm64-v8a/libfastbot_native.so");
  push(bundle.nativeLibs.arm32, "/data/local/tmp/armeabi-v7a/libfastbot_native.so");
  push(bundle.nativeLibs.x86, "/data/local/tmp/x86/libfastbot_native.so");
  push(bundle.nativeLibs.x86_64, "/data/local/tmp/x86_64/libfastbot_native.so");
}

export type FastbotAgentKind = "double-sarsa" | "sarsa";

export interface BuildFastbotShellArgsInput {
  packageName: string;
  logStamp: string;
  runningMinutes: number;
  throttleMs: number;
  fastbotAgent: FastbotAgentKind;
  deviceOutputRoot: string;
  profilePeriod?: number;
  actWhitelistFile?: string;
  actBlacklistFile?: string;
}

/** 拼装 Fastbot 服务启动参数（对齐 Kea2 fastbotManager._startFastbotService）。 */
export function buildFastbotShellArgs(input: BuildFastbotShellArgsInput): string[] {
  const pkg = input.packageName.trim();
  if (!pkg) {
    throw new Error("packageName 不能为空");
  }
  const outputDir = `${input.deviceOutputRoot}/output_${input.logStamp}`;
  const args = [
    "CLASSPATH=/sdcard/monkeyq.jar:/sdcard/framework.jar:/sdcard/fastbot-thirdpart.jar:/sdcard/kea2-thirdpart.jar",
    "exec",
    "app_process",
    "/system/bin",
    "com.android.commands.monkey.Monkey",
    "--agent-u2",
    input.fastbotAgent,
    "--running-minutes",
    String(Math.max(1, Math.floor(input.runningMinutes))),
    "--throttle",
    String(Math.max(0, Math.floor(input.throttleMs))),
    "--output-directory",
    outputDir,
    "-p",
    pkg,
  ];
  if (input.profilePeriod && input.profilePeriod > 0) {
    args.push("--profile-period", String(Math.floor(input.profilePeriod)));
  }
  if (input.actWhitelistFile?.trim()) {
    args.push("--act-whitelist-file", input.actWhitelistFile.trim());
  } else if (input.actBlacklistFile?.trim()) {
    args.push("--act-blacklist-file", input.actBlacklistFile.trim());
  }
  args.push("-v", "-v", "-v");
  return args;
}
