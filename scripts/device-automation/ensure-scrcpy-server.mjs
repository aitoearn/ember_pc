#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildScrcpyServerUrl,
  downloadFile,
  parseArgs,
} from "./download-scrcpy-server.mjs";

const DEFAULT_OUTPUT = "resources/device-automation/scrcpy.jar";

export async function ensureScrcpyServer(options = {}, env = process.env) {
  const args = {
    version: options.version ?? env.DEVICE_AUTOMATION_SCRCPY_VERSION ?? "3.1",
    output:
      options.output ??
      env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH ??
      DEFAULT_OUTPUT,
  };
  const outputPath = path.resolve(args.output);
  if (existsSync(outputPath)) {
    console.log(`[device-automation-assets] scrcpy server 已存在：${outputPath}`);
    return outputPath;
  }
  const url = buildScrcpyServerUrl(args.version);
  console.log(`[device-automation-assets] 正在下载 scrcpy server → ${outputPath}`);
  await downloadFile(url, outputPath);
  console.log(`[device-automation-assets] scrcpy server 已下载到 ${outputPath}`);
  return outputPath;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  await ensureScrcpyServer(parsed);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
