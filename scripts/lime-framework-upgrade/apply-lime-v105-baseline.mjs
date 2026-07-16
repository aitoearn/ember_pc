#!/usr/bin/env node
/**
 * 将当前仓库工作树替换为 Lime v1.105 HEAD，并做 Ember 品牌路径映射。
 * 用法：node scripts/lime-framework-upgrade/apply-lime-v105-baseline.mjs
 *
 * 前置：在 ember_pc 仓库根、工作区干净、当前分支为 feature/lime-v105-rebase。
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();
const LIME_ROOT = process.env.LIME ?? "/Users/lisq/project/agent/lime";
const BRANCH = "feature/lime-v105-rebase";
const PRESERVE_DIRS = [".cursor", "wiki"];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdc",
  ".yml",
  ".yaml",
  ".toml",
  ".rs",
  ".html",
  ".css",
  ".scss",
  ".sh",
  ".plist",
  ".txt",
  ".svg",
  ".xml",
  ".gradle",
  ".properties",
  ".proto",
  ".sql",
  ".hbs",
  ".nix",
  ".rb",
  ".cmake",
  ".in",
  ".lock",
]);

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  "dist-electron",
  "coverage",
  ".turbo",
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    ...options,
  });
  if (result.status !== 0 && !options.allowFail) {
    throw new Error(
      `${command} ${args.join(" ")} 失败: ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

function ensureBranch() {
  const branch = run("git", ["branch", "--show-current"]).stdout.trim();
  if (branch !== BRANCH) {
    throw new Error(`当前分支应为 ${BRANCH}，实际为 ${branch}`);
  }
}

function ensureCleanMain() {
  ensureBranch();
  if (process.env.BASELINE_RESUME === "1") {
    return;
  }
  const status = run("git", ["status", "--porcelain"]).stdout.trim();
  const allowedOnly = status
    .split("\n")
    .filter(Boolean)
    .every((line) => line.includes("scripts/lime-framework-upgrade/"));
  if (status && !allowedOnly) {
    throw new Error("工作区不干净，请先提交或 stash");
  }
}

function preserveLocalDirs(tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  for (const dir of PRESERVE_DIRS) {
    const source = path.join(REPO_ROOT, dir);
    if (fs.existsSync(source)) {
      run("cp", ["-R", source, path.join(tmpDir, dir)]);
    }
  }
}

function restoreLocalDirs(tmpDir) {
  for (const dir of PRESERVE_DIRS) {
    const source = path.join(tmpDir, dir);
    if (fs.existsSync(source)) {
      const target = path.join(REPO_ROOT, dir);
      run("rm", ["-rf", target], { allowFail: true });
      run("cp", ["-R", source, target]);
    }
  }
}

function resolvePreserveDir() {
  if (process.env.BASELINE_PRESERVE_DIR) {
    return process.env.BASELINE_PRESERVE_DIR;
  }
  return path.join("/tmp", `ember-rebase-preserve-${Date.now()}`);
}

function removeTrackedFiles() {
  const listed = run("git", ["ls-files", "-z"]).stdout;
  const files = listed.split("\0").filter(Boolean);
  if (files.length === 0) {
    return;
  }
  for (let index = 0; index < files.length; index += 200) {
    const chunk = files.slice(index, index + 200);
    run("git", ["rm", "-f", "-q", "--ignore-unmatch", "--", ...chunk], {
      allowFail: true,
    });
  }
}

function extractLimeTree(exportDir) {
  fs.rmSync(exportDir, { recursive: true, force: true });
  fs.mkdirSync(exportDir, { recursive: true });
  const archivePath = path.join(exportDir, "lime-v105.tar");
  const archive = spawnSync("git", ["-C", LIME_ROOT, "archive", "HEAD"], {
    encoding: "buffer",
    maxBuffer: 1024 * 1024 * 512,
  });
  if (archive.status !== 0) {
    throw new Error(
      `Lime archive 失败: ${archive.stderr?.toString("utf8") ?? "unknown"}`,
    );
  }
  fs.writeFileSync(archivePath, archive.stdout);
  const extract = spawnSync("tar", ["-xf", archivePath, "-C", exportDir], {
    stdio: "inherit",
  });
  if (extract.status !== 0) {
    throw new Error("tar 解压 Lime archive 失败");
  }
  fs.rmSync(archivePath, { force: true });
  run("rsync", ["-a", `${exportDir}/`, `${REPO_ROOT}/`]);
}

function renameIfExists(fromRelative, toRelative) {
  const from = path.join(REPO_ROOT, fromRelative);
  const to = path.join(REPO_ROOT, toRelative);
  if (!fs.existsSync(from)) {
    return;
  }
  if (fs.existsSync(to)) {
    fs.rmSync(to, { recursive: true, force: true });
  }
  fs.renameSync(from, to);
  console.log(`[baseline] 重命名 ${fromRelative} → ${toRelative}`);
}

function applyDirectoryRenames() {
  renameIfExists("ember-rs", "ember-rs");
  renameIfExists("packages/ember-cli-npm", "packages/ember-cli-npm");
  renameIfExists("extensions/ember-chrome", "extensions/ember-chrome");
}

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!TEXT_EXTENSIONS.has(ext) && !filePath.endsWith("Cargo.lock")) {
    return false;
  }
  const parts = filePath.split(path.sep);
  return !parts.some((part) => SKIP_DIR_NAMES.has(part));
}

function applyTextReplacements() {
  const replacements = [
    [/ember-rs\//g, "ember-rs/"],
    [/\blime-rs\b/g, "ember-rs"],
    [/@embercloud\//g, "@embercloud/"],
    [/@embercloud\b/g, "@embercloud"],
    [/packages\/ember-cli-npm/g, "packages/ember-cli-npm"],
    [/ember-cli-npm/g, "ember-cli-npm"],
    [/extensions\/lime-chrome/g, "extensions/ember-chrome"],
    [/com\.limecloud\.lime/g, "com.embercloud.ember"],
    [/updates\.limecloud\.com/g, "updates.aiearn.me"],
  ];

  let changed = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }
      const relative = path.relative(REPO_ROOT, fullPath);
      if (!shouldProcessFile(relative)) {
        continue;
      }
      const original = fs.readFileSync(fullPath, "utf8");
      let next = original;
      for (const [pattern, replacement] of replacements) {
        next = next.replace(pattern, replacement);
      }
      if (next !== original) {
        fs.writeFileSync(fullPath, next, "utf8");
        changed += 1;
      }
    }
  };
  walk(REPO_ROOT);
  console.log(`[baseline] 文本替换完成，改动 ${changed} 个文件`);
}

function writeEmberProductIdentity() {
  const electronIdentity = `/** 与 scripts/electron/productIdentity.mjs 保持同步。 */
export const APP_DISPLAY_NAME = "熠测";
export const APP_INTERNAL_NAME = "Ember";
`;
  const scriptIdentity = `export const PRODUCT_DISPLAY_NAME = "熠测";
export const PRODUCT_NAME = "Ember";
`;
  fs.mkdirSync(path.join(REPO_ROOT, "electron"), { recursive: true });
  fs.mkdirSync(path.join(REPO_ROOT, "scripts/electron"), { recursive: true });
  fs.writeFileSync(
    path.join(REPO_ROOT, "electron/productIdentity.ts"),
    electronIdentity,
    "utf8",
  );
  fs.writeFileSync(
    path.join(REPO_ROOT, "scripts/electron/productIdentity.mjs"),
    scriptIdentity,
    "utf8",
  );
}

function main() {
  if (!fs.existsSync(LIME_ROOT)) {
    throw new Error(`Lime 仓库不存在: ${LIME_ROOT}`);
  }
  ensureCleanMain();
  const preserveDir = resolvePreserveDir();
  const exportDir = path.join("/tmp", "lime-v105-export");

  if (process.env.BASELINE_RESUME !== "1") {
    console.log("[baseline] 备份本地目录…");
    preserveLocalDirs(preserveDir);
  } else {
    console.log(`[baseline] 恢复模式，使用备份 ${preserveDir}`);
  }

  console.log("[baseline] 移除 Ember 跟踪文件…");
  if (process.env.BASELINE_RESUME !== "1") {
    removeTrackedFiles();
  } else {
    console.log("[baseline] 跳过 git rm（恢复模式）");
  }

  console.log("[baseline] 解压 Lime v1.105 树…");
  extractLimeTree(exportDir);

  console.log("[baseline] 目录重命名…");
  applyDirectoryRenames();

  console.log("[baseline] 全树文本品牌映射…");
  applyTextReplacements();

  console.log("[baseline] 写入 Ember productIdentity…");
  writeEmberProductIdentity();

  console.log("[baseline] 恢复本地目录…");
  restoreLocalDirs(preserveDir);
  if (process.env.BASELINE_RESUME !== "1") {
    fs.rmSync(preserveDir, { recursive: true, force: true });
  }
  fs.rmSync(exportDir, { recursive: true, force: true });

  console.log("[baseline] 完成，请 git add -A && commit");
}

main();
