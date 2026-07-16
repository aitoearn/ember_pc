#!/usr/bin/env node
/**
 * M0.5 Host 接线冒烟（无 Electron UI）。
 * T1/T2 通过 vitest 覆盖 Host 分发；本脚本仅做契约快检。
 *
 * 用法：npm run lime-framework:m05-smoke
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[m0.5-smoke] vitest · deviceAutomationHost + ipcChannels");
run("npx", [
  "vitest",
  "run",
  "electron/deviceAutomationHost.test.ts",
  "electron/ipcChannels.test.ts",
]);

console.log("[m0.5-smoke] T5 · perf adb（可选，需在线设备）");
const adb = spawnSync("adb", ["devices"], { encoding: "utf8" });
if (adb.status === 0 && /device\s*$/m.test(adb.stdout)) {
  run("npm", ["run", "smoke:perf-monitor-adb"]);
} else {
  console.log("[m0.5-smoke] 跳过 T5：无在线 Android 设备");
}

console.log("[m0.5-smoke] 结构快检通过");
