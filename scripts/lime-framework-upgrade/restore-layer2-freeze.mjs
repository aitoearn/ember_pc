#!/usr/bin/env node
/**
 * 从 HEAD 恢复 Layer 2 冻结路径（合入 Lime 后清掉误触碰的 Harness 等文件）。
 *
 * 用法：
 *   node scripts/lime-framework-upgrade/restore-layer2-freeze.mjs --dry-run
 *   node scripts/lime-framework-upgrade/restore-layer2-freeze.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { loadFreezeManifest } from "./lib/freeze-manifest.mjs";
import { findFreezeViolations } from "./lib/freeze-manifest.mjs";

const REPO_ROOT = process.cwd();

function parseArgs(argv) {
  const options = { dryRun: false, skipDirectories: false };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    }
    if (arg === "--skip-directories") {
      options.skipDirectories = true;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function gitLines(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 失败: ${result.stderr || result.stdout}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`用法:
  node scripts/lime-framework-upgrade/restore-layer2-freeze.mjs [--dry-run] [--skip-directories]

从 HEAD 恢复当前工作区相对冻结清单的触碰路径（默认含 Harness glob）。
加 --skip-directories 时跳过 freezeDirectories（如 packages/ember-cli-npm）。`);
    process.exit(0);
  }

  const changed = [
    ...gitLines(["diff", "--name-only", "HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ];
  const { violations } = findFreezeViolations(changed, { mapLimeRs: false });
  const toRestore = violations
    .filter((item) => {
      if (!options.skipDirectories) {
        return true;
      }
      return item.reason === "glob" || item.reason === "exact";
    })
    .map((item) => item.path);

  if (toRestore.length === 0) {
    console.log("[layer2-restore] 无需恢复");
    return;
  }

  console.log(`[layer2-restore] 将恢复 ${toRestore.length} 个路径到 HEAD`);
  for (const filePath of toRestore) {
    console.log(`  - ${filePath}`);
  }

  if (options.dryRun) {
    console.log("[layer2-restore] dry-run 结束");
    return;
  }

  const tracked = [];
  const untracked = [];
  for (const filePath of toRestore) {
    const result = spawnSync("git", ["ls-files", "--error-unmatch", filePath], {
      encoding: "utf8",
    });
    if (result.status === 0) {
      tracked.push(filePath);
      continue;
    }
    untracked.push(filePath);
  }

  if (tracked.length > 0) {
    const result = spawnSync("git", ["checkout", "HEAD", "--", ...tracked], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      console.error(
        "[layer2-restore] git checkout 失败",
        result.stderr || result.stdout,
      );
      process.exit(1);
    }
  }

  for (const filePath of untracked) {
    const absolutePath = path.join(REPO_ROOT, filePath);
    if (fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, { force: true });
    }
  }

  console.log(
    `[layer2-restore] 完成（恢复跟踪文件 ${tracked.length}，删除未跟踪 ${untracked.length}）`,
  );
}

main();
