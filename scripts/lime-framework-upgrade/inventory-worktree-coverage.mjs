#!/usr/bin/env node
/**
 * 盘点当前工作区相对 HEAD 的改动，与 Lime 各批次 diff 的重叠率。
 *
 * 用法：node scripts/lime-framework-upgrade/inventory-worktree-coverage.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadFreezeManifest } from "./lib/freeze-manifest.mjs";
import { mapLimePathToEmber } from "./lib/freeze-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();
const LIME_ROOT =
  process.env.LIME ?? process.env.LIME_ROOT ?? "/Users/lisq/project/agent/lime";

function gitLines(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 失败: ${result.stderr || result.stdout}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveBatchRange(manifest, batch) {
  const boundaries = manifest.batchBoundaries?.[batch];
  if (!boundaries?.from || !boundaries?.to) {
    throw new Error(`缺少批次边界: ${batch}`);
  }
  return `${boundaries.from}..${boundaries.to}`;
}

function mapLimePaths(paths) {
  return paths.map((filePath) => mapLimePathToEmber(filePath));
}

function overlapCount(left, right) {
  const rightSet = new Set(right);
  return left.filter((filePath) => rightSet.has(filePath)).length;
}

function main() {
  if (!fs.existsSync(LIME_ROOT)) {
    console.error(`[inventory] Lime 仓库不存在: ${LIME_ROOT}`);
    process.exit(1);
  }

  const { manifest } = loadFreezeManifest();
  const worktreeChanged = [
    ...gitLines(REPO_ROOT, ["diff", "--name-only", "HEAD"]),
    ...gitLines(REPO_ROOT, ["ls-files", "--others", "--exclude-standard"]),
  ];
  const uniqueWorktree = [...new Set(worktreeChanged.map(mapLimePathToEmber))];

  console.log(`[inventory] 工作区变更（含未跟踪）: ${uniqueWorktree.length} 个路径`);
  console.log(`[inventory] Lime 仓库: ${LIME_ROOT}`);
  console.log("");

  for (const batch of ["A", "B", "C", "D"]) {
    const range = resolveBatchRange(manifest, batch);
    const limePaths = mapLimePaths(
      gitLines(LIME_ROOT, ["diff", "--name-only", range]),
    );
    const matched = overlapCount(uniqueWorktree, limePaths);
    const pct =
      limePaths.length === 0
        ? "n/a"
        : `${((matched / limePaths.length) * 100).toFixed(1)}%`;
    console.log(
      `[inventory] Batch ${batch} (${range}): Lime ${limePaths.length} 文件，工作区已覆盖 ${matched}（${pct}）`,
    );
  }

  const topLevels = ["packages", "scripts", "electron", "src/lib", "ember-rs"];
  console.log("");
  console.log("[inventory] 域级 Batch A 重叠:");
  const batchARange = resolveBatchRange(manifest, "A");
  const batchAPaths = new Set(
    mapLimePaths(gitLines(LIME_ROOT, ["diff", "--name-only", batchARange])),
  );
  for (const dir of topLevels) {
    const wt = uniqueWorktree.filter(
      (filePath) => filePath === dir || filePath.startsWith(`${dir}/`),
    );
    const matched = wt.filter((filePath) => batchAPaths.has(filePath)).length;
    console.log(
      `  - ${dir}: 工作区 ${wt.length}，命中 Batch A ${matched}`,
    );
  }
}

main();
