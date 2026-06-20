#!/usr/bin/env node
/**
 * 性能监控 P1 · 真机 ADB 冒烟（无 Electron UI）。
 * 用法：node scripts/device-automation/perf-monitor-adb-smoke.mjs [deviceId]
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const INTERVAL_MS = 1000;

function listOnlineDevices() {
  const result = spawnSync("adb", ["devices"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`adb devices 失败：${result.stderr || result.stdout}`);
  }
  const devices = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^(\S+)\s+device$/);
    if (match) {
      devices.push(match[1]);
    }
  }
  return devices;
}

async function main() {
  const argDeviceId = process.argv[2]?.trim();
  const devices = listOnlineDevices();
  if (devices.length === 0) {
    console.error("[perf-adb-smoke] 未发现在线 Android 设备");
    process.exitCode = 1;
    return;
  }
  const deviceId = argDeviceId || devices[0];
  if (!devices.includes(deviceId)) {
    console.error(
      `[perf-adb-smoke] 设备 ${deviceId} 不在线，当前：${devices.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  const { collectAndroidPerfSample, parseThirdPartyPackages } = await import(
    path.join(
      repoRoot,
      "electron/deviceAutomation/performanceMonitor/androidCollectors.ts",
    )
  );

  const execAdbSync = (targetDeviceId, args) => {
    const result = spawnSync("adb", ["-s", targetDeviceId, ...args], {
      encoding: "utf8",
      shell: false,
    });
    return {
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
      exitCode: result.status,
    };
  };

  console.log(`[perf-adb-smoke] 使用设备 ${deviceId}`);

  const packagesResult = execAdbSync(deviceId, [
    "shell",
    "pm",
    "list",
    "packages",
    "-3",
  ]);
  if (packagesResult.exitCode !== 0) {
    throw new Error(
      `pm list packages 失败：${packagesResult.stderr || packagesResult.stdout}`,
    );
  }
  const packages = parseThirdPartyPackages(packagesResult.stdout);
  if (packages.length === 0) {
    throw new Error("未找到第三方应用包名");
  }
  const packageName = packages[0];
  console.log(
    `[perf-adb-smoke] 第三方应用 ${packages.length} 个，采样包名 ${packageName}`,
  );

  const metrics = new Set(["cpu", "memory", "fps"]);
  let procStatPrevious = null;
  let gfxFramesPrevious = null;

  for (let tick = 1; tick <= 2; tick += 1) {
    const sample = collectAndroidPerfSample({
      execAdbSync,
      deviceId,
      packageName,
      metrics,
      intervalMs: INTERVAL_MS,
      procStatPrevious,
      gfxFramesPrevious,
    });
    procStatPrevious = sample.procStatPrevious;
    gfxFramesPrevious = sample.gfxFramesPrevious;
    console.log(`[perf-adb-smoke] tick ${tick} 数据`, sample.data);
  }

  const lastSample = collectAndroidPerfSample({
    execAdbSync,
    deviceId,
    packageName,
    metrics,
    intervalMs: INTERVAL_MS,
    procStatPrevious,
    gfxFramesPrevious,
  });
  const keys = Object.keys(lastSample.data);
  if (keys.length === 0) {
    console.warn(
      "[perf-adb-smoke] 警告：最后一帧无指标（应用可能未运行，CPU/FPS 为空属正常）",
    );
  }

  console.log("[perf-adb-smoke] 通过：ADB 采集链路可用");
}

main().catch((error) => {
  console.error(
    `[perf-adb-smoke] 失败：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
