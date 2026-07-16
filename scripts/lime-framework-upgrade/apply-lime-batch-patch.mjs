#!/usr/bin/env node
/**
 * 过滤并试应用 Lime batch patch（不自动提交）。
 *
 * 用法：
 *   node scripts/lime-framework-upgrade/apply-lime-batch-patch.mjs --batch A
 *   node scripts/lime-framework-upgrade/apply-lime-batch-patch.mjs --patch /tmp/custom.patch --apply
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    batch: null,
    patch: null,
    apply: false,
    dirs: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--batch") {
      options.batch = argv[index + 1]?.toUpperCase();
      index += 1;
      continue;
    }
    if (arg === "--patch") {
      options.patch = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--dirs") {
      options.dirs = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
}

function runNodeScript(scriptName, args) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  return result.status ?? 1;
}

function gitApplyCheck(patchPath) {
  const result = spawnSync("git", ["apply", "--check", "--whitespace=nowarn", patchPath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return result;
}

function gitApply(patchPath) {
  const result = spawnSync("git", ["apply", "--whitespace=nowarn", patchPath], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return result;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`用法:
  node scripts/lime-framework-upgrade/apply-lime-batch-patch.mjs --batch A [--dirs packages,scripts] [--apply]

步骤:
  1. export-lime-batch-patch.mjs 导出
  2. filter-lime-batch-patch.mjs 剔除冻结区 + lime-rs 映射
  3. git apply --check / git apply`);
    process.exit(0);
  }

  const batch = options.batch?.toLowerCase();
  const rawPatch =
    options.patch ?? path.join("/tmp", `lime-batch-${batch ?? "custom"}.patch`);
  const filteredPatch = rawPatch.replace(/\.patch$/, ".filtered.patch");

  if (!options.patch) {
    if (!options.batch) {
      console.error("需要 --batch 或 --patch");
      process.exit(1);
    }
    const exportArgs = ["--batch", options.batch];
    if (options.dirs) {
      exportArgs.push("--dirs", options.dirs);
    }
    exportArgs.push("--output", rawPatch);
    if (runNodeScript("export-lime-batch-patch.mjs", exportArgs) !== 0) {
      process.exit(1);
    }
  } else if (!fs.existsSync(rawPatch)) {
    console.error(`patch 不存在: ${rawPatch}`);
    process.exit(1);
  }

  if (
    runNodeScript("filter-lime-batch-patch.mjs", [
      "--input",
      rawPatch,
      "--output",
      filteredPatch,
    ]) !== 0
  ) {
    process.exit(1);
  }

  const check = gitApplyCheck(filteredPatch);
  if (check.status !== 0) {
    console.error("[lime-apply] git apply --check 失败，需手工三路合并");
    if (check.stderr) {
      console.error(check.stderr);
    }
    if (check.stdout) {
      console.error(check.stdout);
    }
    process.exit(1);
  }
  console.log("[lime-apply] git apply --check 通过");

  if (options.apply) {
    const applied = gitApply(filteredPatch);
    if (applied.status !== 0) {
      console.error("[lime-apply] git apply 失败");
      if (applied.stderr) {
        console.error(applied.stderr);
      }
      process.exit(1);
    }
    console.log("[lime-apply] 已应用 patch（未提交）");
    console.log("[lime-apply] 下一步: 品牌替换 + npm run lime-framework:check-freeze + verify:local");
  }
}

main();
