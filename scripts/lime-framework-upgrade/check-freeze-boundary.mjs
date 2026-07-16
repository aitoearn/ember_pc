#!/usr/bin/env node
/**
 * Lime 框架升级 · 冻结边界守卫
 *
 * 合入 Lime patch 或提交前，断言变更路径未触碰 Layer 2 冻结区。
 * 事实源：docs/exec-plans/lime-framework-upgrade-freeze-manifest.json
 *
 * 用法：
 *   node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --git-diff
 *   node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --git-diff --staged
 *   node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --patch /tmp/batch-a.patch
 *   node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --files src/foo.ts electron/bar.ts
 *   node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --git-diff HEAD~1..HEAD
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  checkPackageJsonScriptsProtection,
  findFreezeViolations,
  parsePatchFilePaths,
} from "./lib/freeze-manifest.mjs";

function printUsage() {
  console.log(`用法:
  node scripts/lime-framework-upgrade/check-freeze-boundary.mjs [选项]

选项（互斥，默认 --git-diff）:
  --git-diff [range]   检查 git diff --name-only（默认工作区相对 HEAD）
  --staged             与 --git-diff 联用，检查暂存区
  --patch <file>       检查 unified diff / git patch 文件中的路径
  --files <p1> [p2…]   检查显式文件列表
  --no-map-lime-rs     不做 lime-rs → ember-rs 路径映射
  --check-package-scripts  额外检查 package.json 保护脚本键仍存在
  --help               显示帮助
`);
}

function parseArgs(argv) {
  const options = {
    mode: "git-diff",
    gitRange: null,
    staged: false,
    patchPath: null,
    files: [],
    mapLimeRs: true,
    checkPackageScripts: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--git-diff") {
      options.mode = "git-diff";
      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        options.gitRange = next;
        index += 1;
      }
      continue;
    }
    if (arg === "--staged") {
      options.staged = true;
      continue;
    }
    if (arg === "--patch") {
      options.mode = "patch";
      options.patchPath = argv[index + 1];
      if (!options.patchPath) {
        throw new Error("--patch 需要文件路径参数");
      }
      index += 1;
      continue;
    }
    if (arg === "--files") {
      options.mode = "files";
      index += 1;
      while (index < argv.length && !argv[index].startsWith("-")) {
        options.files.push(argv[index]);
        index += 1;
      }
      index -= 1;
      continue;
    }
    if (arg === "--no-map-lime-rs") {
      options.mapLimeRs = false;
      continue;
    }
    if (arg === "--check-package-scripts") {
      options.checkPackageScripts = true;
      continue;
    }
    throw new Error(`未知参数: ${arg}`);
  }

  if (options.mode === "files" && options.files.length === 0) {
    throw new Error("--files 至少需要一个路径");
  }

  return options;
}

function collectGitDiffPaths(options) {
  const args = ["diff", "--name-only"];
  if (options.staged) {
    args.push("--cached");
  } else if (options.gitRange) {
    args.push(options.gitRange);
  }
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git diff 失败: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectPatchPaths(patchPath) {
  const content = fs.readFileSync(patchPath, "utf8");
  return parsePatchFilePaths(content);
}

function reportViolations(violations) {
  console.error("[lime-freeze-boundary] 检测到冻结区触碰，合入已阻断:");
  for (const item of violations) {
    const mapped = item.sourcePath
      ? `${item.sourcePath} → ${item.path}`
      : item.path;
    console.error(`  - ${mapped} (${item.reason})`);
  }
  console.error("");
  console.error(
    "修复：从 Lime patch 排除该路径，或合入后从 Layer2 备份 restore。清单见 docs/exec-plans/lime-framework-upgrade-freeze-manifest.json",
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  let filePaths = [];
  if (options.mode === "git-diff") {
    filePaths = collectGitDiffPaths(options);
  } else if (options.mode === "patch") {
    filePaths = collectPatchPaths(options.patchPath);
  } else {
    filePaths = options.files;
  }

  const { violations, protectedCount } = findFreezeViolations(filePaths, {
    mapLimeRs: options.mapLimeRs,
  });

  let packageScriptsOk = true;
  let missingScripts = [];
  if (options.checkPackageScripts) {
    const result = checkPackageJsonScriptsProtection();
    packageScriptsOk = result.ok;
    missingScripts = result.missing;
  }

  if (violations.length > 0) {
    reportViolations(violations);
  }

  if (!packageScriptsOk) {
    console.error(
      "[lime-freeze-boundary] package.json 缺少受保护脚本:",
      missingScripts.join(", "),
    );
  }

  if (violations.length === 0 && packageScriptsOk) {
    console.log(
      `[lime-freeze-boundary] 通过：检查 ${filePaths.length} 个路径，${protectedCount} 个在非冻结区`,
    );
    process.exit(0);
  }

  process.exit(1);
}

main();
