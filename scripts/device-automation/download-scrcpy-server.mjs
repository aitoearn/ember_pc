#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_VERSION = "3.1";
const DEFAULT_OUTPUT = "resources/device-automation/scrcpy.jar";

export function buildScrcpyServerUrl(version = DEFAULT_VERSION) {
  const normalizedVersion = String(version).replace(/^v/i, "").trim();
  return `https://github.com/Genymobile/scrcpy/releases/download/v${normalizedVersion}/scrcpy-server-v${normalizedVersion}`;
}

export function parseArgs(argv, env = process.env) {
  const result = {
    version: env.DEVICE_AUTOMATION_SCRCPY_VERSION || DEFAULT_VERSION,
    output: env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH || DEFAULT_OUTPUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--version" && argv[index + 1]) {
      result.version = argv[index + 1];
      index += 1;
    } else if (item === "--output" && argv[index + 1]) {
      result.output = argv[index + 1];
      index += 1;
    }
  }
  return result;
}

export async function downloadFile(url, outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await rm(outputPath, { force: true });
  await new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        response.resume();
        const location = response.headers.location;
        if (!location) {
          reject(new Error(`scrcpy server 下载重定向缺少 Location：${url}`));
          return;
        }
        downloadFile(new URL(location, url).toString(), outputPath)
          .then(resolve, reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`scrcpy server 下载失败：HTTP ${statusCode}`));
        return;
      }
      const file = createWriteStream(outputPath);
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
      file.on("error", reject);
    });
    request.on("error", reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(args.output);
  const url = buildScrcpyServerUrl(args.version);
  await downloadFile(url, outputPath);
  console.log(`[device-automation-assets] scrcpy server 已下载到 ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
