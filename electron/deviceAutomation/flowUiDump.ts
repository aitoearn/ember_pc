/**
 * Android UI 树 dump（uiautomator）与截图，供确定性定位与回放留痕。
 */

import { spawnSync } from "node:child_process";
import { resolveAdbPath } from "./deviceInventoryWatcher";
import { execAdbSync } from "./scrcpyAdbFastPath";

const REMOTE_DUMP_PATH = "/sdcard/lime_flow_ui_dump.xml";

export function dumpUiTreeXml(deviceId: string): string {
  const dumpResult = execAdbSync(deviceId, [
    "shell",
    "uiautomator",
    "dump",
    REMOTE_DUMP_PATH,
  ]);
  if (dumpResult.exitCode !== 0) {
    throw new Error(
      `uiautomator dump 失败：${dumpResult.stderr.trim() || dumpResult.stdout.trim()}`,
    );
  }
  const readResult = execAdbSync(deviceId, ["shell", "cat", REMOTE_DUMP_PATH]);
  if (readResult.exitCode !== 0 || !readResult.stdout.trim()) {
    throw new Error("读取 UI dump 失败");
  }
  return readResult.stdout;
}

function parsePngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

/** adb exec-out screencap，返回 base64 PNG 与屏幕尺寸。 */
export function captureDeviceScreenshot(deviceId: string): {
  base64: string;
  mediaType: string;
  width: number;
  height: number;
} {
  const adb = resolveAdbPath(process.env) ?? "adb";
  const result = spawnSync(adb, ["-s", deviceId, "exec-out", "screencap", "-p"], {
    encoding: "buffer",
    shell: false,
  });
  const stdout = result.stdout as Buffer;
  if (!stdout || stdout.length === 0) {
    throw new Error("截图失败：空输出");
  }
  const size = parsePngSize(stdout);
  if (!size) {
    throw new Error("截图非 PNG 或尺寸解析失败");
  }
  return {
    base64: stdout.toString("base64"),
    mediaType: "image/png",
    width: size.width,
    height: size.height,
  };
}
