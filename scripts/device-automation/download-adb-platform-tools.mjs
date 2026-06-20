#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_OUTPUT = "resources/device-automation/adb";

export function platformToolsLabel(platform = process.platform) {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "darwin";
  }
  return "linux";
}

export function buildPlatformToolsUrl(platform = process.platform) {
  const label = platformToolsLabel(platform);
  return `https://dl.google.com/android/repository/platform-tools-latest-${label}.zip`;
}

export function adbFilesForPlatform(platform = process.platform) {
  return platform === "win32"
    ? ["adb.exe", "AdbWinApi.dll", "AdbWinUsbApi.dll"]
    : ["adb"];
}

export function parseArgs(argv, env = process.env) {
  const result = {
    output: env.DEVICE_AUTOMATION_ADB_DIR || DEFAULT_OUTPUT,
    platform: process.platform,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--output" && argv[index + 1]) {
      result.output = argv[index + 1];
      index += 1;
    } else if (item === "--platform" && argv[index + 1]) {
      result.platform = argv[index + 1];
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
          reject(new Error(`platform-tools 下载重定向缺少 Location：${url}`));
          return;
        }
        downloadFile(new URL(location, url).toString(), outputPath)
          .then(resolve, reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`platform-tools 下载失败：HTTP ${statusCode}`));
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

async function extractZip(zipPath, outputDir, platform) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  if (platform === "win32") {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Expand-Archive",
      "-Force",
      "-LiteralPath",
      zipPath,
      "-DestinationPath",
      outputDir,
    ]);
    return;
  }
  await execFileAsync("unzip", ["-q", "-o", zipPath, "-d", outputDir]);
}

async function stageAdbFiles(extractedDir, outputDir, platform) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  for (const file of adbFilesForPlatform(platform)) {
    await cp(
      path.join(extractedDir, "platform-tools", file),
      path.join(outputDir, file),
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tempDir = await mkdtemp(path.join(tmpdir(), "ember-platform-tools-"));
  const zipPath = path.join(tempDir, "platform-tools.zip");
  const extractedDir = path.join(tempDir, "extracted");
  try {
    await downloadFile(buildPlatformToolsUrl(args.platform), zipPath);
    await extractZip(zipPath, extractedDir, args.platform);
    await stageAdbFiles(extractedDir, path.resolve(args.output), args.platform);
    console.log(
      `[device-automation-assets] adb platform-tools 已暂存到 ${path.resolve(args.output)}`,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
