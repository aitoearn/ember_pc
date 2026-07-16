#!/usr/bin/env node
/**
 * 从 Lime 仓库导出批次 patch，并可选运行冻结边界检查。
 *
 * 用法：
 *   LIME=/path/to/lime node scripts/lime-framework-upgrade/export-lime-batch-patch.mjs --batch A
 *   LIME=/path/to/lime node scripts/lime-framework-upgrade/export-lime-batch-patch.mjs --batch B --dirs packages,src/lib
 *   ... --check   # 导出后立刻跑 check-freeze-boundary
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadFreezeManifest } from "./lib/freeze-manifest.mjs";
import { findFreezeViolations } from "./lib/freeze-manifest.mjs";
import { parsePatchFilePaths } from "./lib/freeze-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    batch: null,
    limeRoot: process.env.LIME ?? process.env.LIME_ROOT ?? null,
    dirs: null,
    output: null,
    check: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--batch") {
      options.batch = argv[index + 1]?.toUpperCase();
      index += 1;
      continue;
    }
    if (arg === "--lime") {
      options.limeRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--dirs") {
      options.dirs = argv[index + 1]?.split(",").map((item) => item.trim());
      index += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--check") {
      options.check = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function resolveBatchRange(manifest, batch) {
  const boundaries = manifest.batchBoundaries?.[batch];
  if (!boundaries?.from || !boundaries?.to) {
    throw new Error(`未知批次或 manifest 缺少边界: ${batch}`);
  }
  return `${boundaries.from}..${boundaries.to}`;
}

function exportPatch(limeRoot, gitRange, dirs) {
  const args = ["diff", gitRange];
  if (dirs?.length) {
    for (const dir of dirs) {
      args.push("--", `${dir}/`);
    }
  }
  const result = spawnSync("git", args, {
    cwd: limeRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Lime git diff 失败: ${result.stderr || result.stdout || "unknown"}`,
    );
  }
  return result.stdout;
}

function listChangedFiles(limeRoot, gitRange, dirs) {
  const args = ["diff", "--name-only", gitRange];
  if (dirs?.length) {
    for (const dir of dirs) {
      args.push("--", `${dir}/`);
    }
  }
  const result = spawnSync("git", args, {
    cwd: limeRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Lime git diff --name-only 失败: ${result.stderr}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function printUsage() {
  console.log(`用法:
  LIME=/path/to/lime node scripts/lime-framework-upgrade/export-lime-batch-patch.mjs --batch A|B|C|D [选项]

选项:
  --lime <path>        Lime 仓库路径（默认 $LIME 或 $LIME_ROOT）
  --dirs a,b,c         仅导出指定顶层目录（默认全部）
  --output,-o <file>   输出 patch 路径（默认 /tmp/lime-batch-<批>.patch）
  --check              导出后检查冻结边界（lime-rs 自动映射为 ember-rs）
  --help
`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.batch || !["A", "B", "C", "D"].includes(options.batch)) {
    console.error("必须指定 --batch A|B|C|D");
    printUsage();
    process.exit(1);
  }

  if (!options.limeRoot || !fs.existsSync(options.limeRoot)) {
    console.error(
      "请设置 LIME 或 LIME_ROOT 环境变量，或使用 --lime 指定 Lime 仓库路径",
    );
    process.exit(1);
  }

  const { manifest } = loadFreezeManifest();
  const gitRange = resolveBatchRange(manifest, options.batch);
  const outputPath =
    options.output ??
    path.join("/tmp", `lime-batch-${options.batch.toLowerCase()}.patch`);

  const changedFiles = listChangedFiles(
    options.limeRoot,
    gitRange,
    options.dirs,
  );
  const patch = exportPatch(options.limeRoot, gitRange, options.dirs);
  fs.writeFileSync(outputPath, patch, "utf8");

  console.log(
    `[lime-export] Batch ${options.batch} (${gitRange})：${changedFiles.length} 个文件 → ${outputPath}`,
  );
  console.log(
    `[lime-export] 合入前建议: git apply --check ${outputPath}（在 ember 仓库，冲突则手工合并）`,
  );

  if (options.check) {
    const patchPaths = parsePatchFilePaths(patch);
    const { violations } = findFreezeViolations(patchPaths, { mapLimeRs: true });
    if (violations.length > 0) {
      console.error("[lime-export] 冻结边界检查失败（需手工三路合并或合入后 restore）:");
      for (const item of violations) {
        const label = item.sourcePath
          ? `${item.sourcePath} → ${item.path}`
          : item.path;
        console.error(`  - ${label} (${item.reason})`);
      }
      const registration = manifest.postMergeRegistrationCheck;
      if (registration?.paths?.length) {
        console.warn(
          "[lime-export] 提示：mod.rs 类文件若仅因 Batch C 挂载点变更触碰，用 postMergeRegistrationCheck 人工核对，不必整批放弃。",
        );
      }
      process.exit(1);
    }
    console.log("[lime-export] 冻结边界检查通过");
  }

  process.exit(0);
}

main();
