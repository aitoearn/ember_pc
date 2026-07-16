#!/usr/bin/env node
/**
 * Layer 2 冻结区备份（合入 Lime 批次前执行）。
 * 读取 freeze-manifest，打包 freezeDirectories / freezeFiles / freezeGlobPatterns 覆盖路径。
 *
 * 用法：
 *   node scripts/lime-framework-upgrade/backup-layer2-freeze.mjs
 *   node scripts/lime-framework-upgrade/backup-layer2-freeze.mjs --output docs/exec-plans/artifacts/layer2-freeze-2026-07-16.tar.gz
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadFreezeManifest } from "./lib/freeze-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "docs/exec-plans/artifacts");

function parseArgs(argv) {
  const options = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output" || arg === "-o") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function expandGlobPattern(pattern) {
  const glob = pattern.includes("*")
    ? pattern
    : pattern.endsWith("/")
      ? `${pattern}**`
      : pattern;
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", glob],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectFreezePaths(manifest) {
  const paths = new Set();

  for (const dir of manifest.freezeDirectories ?? []) {
    const normalized = dir.replace(/\/+$/, "");
    if (fs.existsSync(path.join(REPO_ROOT, normalized))) {
      paths.add(normalized);
    }
  }

  for (const file of manifest.freezeFiles ?? []) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      paths.add(file);
    }
  }

  for (const pattern of manifest.freezeGlobPatterns ?? []) {
    for (const match of expandGlobPattern(pattern)) {
      paths.add(match);
    }
  }

  for (const file of manifest.emberOnlyRustModules ?? []) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      paths.add(file);
    }
  }

  for (const file of manifest.emberOnlyApiGateway ?? []) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      paths.add(file);
    }
  }

  for (const file of manifest.emberOnlyAgentRuntimeApi ?? []) {
    if (fs.existsSync(path.join(REPO_ROOT, file))) {
      paths.add(file);
    }
  }

  return [...paths].sort();
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join(DEFAULT_OUTPUT_DIR, `layer2-freeze-${stamp}.tar.gz`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`用法: node scripts/lime-framework-upgrade/backup-layer2-freeze.mjs [--output path]`);
    process.exit(0);
  }

  const { manifest } = loadFreezeManifest();
  const freezePaths = collectFreezePaths(manifest);
  if (freezePaths.length === 0) {
    console.error("[layer2-backup] 未找到可备份的冻结路径");
    process.exitCode = 1;
    return;
  }

  const outputPath = path.resolve(options.output ?? defaultOutputPath());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const listFile = path.join(DEFAULT_OUTPUT_DIR, ".layer2-freeze-paths.txt");
  fs.mkdirSync(path.dirname(listFile), { recursive: true });
  fs.writeFileSync(listFile, `${freezePaths.join("\n")}\n`, "utf8");

  const result = spawnSync(
    "tar",
    ["-czf", outputPath, "-T", listFile, "-C", REPO_ROOT],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error("[layer2-backup] tar 失败", result.stderr || result.stdout);
    process.exitCode = 1;
    return;
  }

  const stat = fs.statSync(outputPath);
  console.log(`[layer2-backup] 已备份 ${freezePaths.length} 条路径`);
  console.log(`[layer2-backup] 清单: ${listFile}`);
  console.log(`[layer2-backup] 产物: ${outputPath} (${stat.size} bytes)`);
}

main();
