/**
 * HarmonyOS 设备枚举（hdc）。
 *
 * agent-device CLI 目前只枚举 android/ios/macos/linux，不发现鸿蒙设备；
 * Android 走 `adb track-devices` 快速通道。此模块提供对称的鸿蒙「快速通道」：
 * 通过 `hdc list targets` 列出已连接的 HarmonyOS 真机/模拟器，产出
 * 与 agent-device 一致的 `AgentDeviceCliRecord`，再由 runtime 合并进设备清单。
 */

import type { AgentDeviceCliRecord } from "./agentDeviceCli";
import { execHdcSync, type HdcExecSync } from "./resolveHdcPath";

/** hdc 无设备时的占位输出。 */
const HDC_EMPTY_TARGET = "[empty]";

/**
 * 解析 `hdc list targets` 输出的设备序列号列表。
 *
 * 正常输出每行一个连接键（connect key / 序列号）；无设备时输出 `[Empty]`。
 * 兼容 `-v` 详细模式（首列取序列号，忽略其余状态列）。
 */
export function parseHdcTargets(stdout: string): string[] {
  const serials: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.toLowerCase() === HDC_EMPTY_TARGET) {
      continue;
    }
    // 忽略 hdc 的提示/错误行（如 "[Fail]..." 或包含空白分隔的说明）。
    if (line.startsWith("[")) {
      continue;
    }
    // 详细模式下以制表符/空白分列，序列号在首列。
    const serial = line.split(/\s+/)[0]?.trim();
    if (!serial || seen.has(serial)) {
      continue;
    }
    seen.add(serial);
    serials.push(serial);
  }
  return serials;
}

/** 通过 `hdc list targets` 枚举 HarmonyOS 设备。失败时返回空数组，不抛错。 */
export function listHarmonyDevices(
  exec: HdcExecSync = execHdcSync,
): AgentDeviceCliRecord[] {
  let result: { stdout: string; stderr: string; exitCode: number | null };
  try {
    // deviceId 为空 → 不带 -t，列出全部目标。
    result = exec("", ["list", "targets"]);
  } catch (error) {
    console.warn("[device-automation] hdc list targets 执行失败", error);
    return [];
  }

  if (result.exitCode !== 0 && !result.stdout.trim()) {
    const message = result.stderr.trim() || result.stdout.trim();
    if (message) {
      console.warn("[device-automation] hdc list targets 返回异常", message);
    }
    return [];
  }

  return parseHdcTargets(result.stdout).map((serial) => ({
    platform: "harmony",
    id: serial,
    name: serial,
    kind: "device",
    target: serial,
    booted: true,
  }));
}
