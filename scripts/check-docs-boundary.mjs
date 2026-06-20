#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, "docs");

const engineeringDirectories = [
  "aiprompts",
  "develop",
  "exec-plans",
  "refactor",
  "roadmap",
  "test",
  "testing",
  "tests",
];

const publicDocsDirectories = ["images", "superpowers"];

const requiredFiles = ["docs/README.md"];
const requiredIgnoreRules = [
  "docs/.data/",
  "docs/.nuxt/",
  "docs/.output/",
  "docs/exec-plans/",
  "docs/roadmap/**",
];
const skippedDirectories = new Set([
  ".git",
  ".ember",
  ".tmp",
  ".tmp-smoke",
  "node_modules",
  "target",
  "dist",
  "ember-rs/target",
]);
const skippedExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".zip",
]);

function toRelativePath(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function isSkippedDirectory(relativeDirectory) {
  return [...skippedDirectories].some(
    (skippedDirectory) =>
      relativeDirectory === skippedDirectory ||
      relativeDirectory.startsWith(`${skippedDirectory}/`),
  );
}

function listRepoFiles() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "-co", "--exclude-standard", "-z"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    return output.split("\0").filter(Boolean);
  } catch {
    return listFilesRecursively(repoRoot).map(toRelativePath);
  }
}

function listFilesRecursively(directoryPath) {
  const relativeDirectory = toRelativePath(directoryPath);
  if (isSkippedDirectory(relativeDirectory)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function shouldScanFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return false;
  }

  if (relativePath === "node_modules" || relativePath.startsWith("node_modules/")) {
    return false;
  }

  if (relativePath.includes("/node_modules/")) {
    return false;
  }

  if (relativePath.startsWith("ember-rs/target")) {
    return false;
  }

  const extension = path.extname(relativePath).toLowerCase();
  if (skippedExtensions.has(extension)) {
    return false;
  }

  const stat = fs.statSync(absolutePath);
  return stat.size <= 2 * 1024 * 1024;
}

function listTrackedIgnoredEngineeringDocs() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "-ci", "--exclude-standard", "-z", "docs"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    return output
      .split("\0")
      .filter(Boolean)
      .filter((filePath) =>
        engineeringDirectories.some(
          (directoryName) =>
            filePath === `docs/${directoryName}` ||
            filePath.startsWith(`docs/${directoryName}/`),
        ),
      );
  } catch {
    return [];
  }
}

function main() {
  const failures = [];

  for (const relativePath of requiredFiles) {
    if (!fileExists(relativePath)) {
      failures.push(`缺少文档入口文件: ${relativePath}`);
    }
  }

  if (!fs.existsSync(docsRoot)) {
    failures.push("缺少 docs/ 文档根目录");
  } else {
    const entries = fs.readdirSync(docsRoot, { withFileTypes: true });
    const entryNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const directoryName of engineeringDirectories) {
      if (!entryNames.includes(directoryName)) {
        failures.push(`docs/${directoryName}/ 缺失，工程文档应统一落在 docs/ 下`);
      }
    }

    for (const directoryName of publicDocsDirectories) {
      if (!entryNames.includes(directoryName)) {
        failures.push(`docs/${directoryName}/ 缺失，产品资料目录应保留在 docs/ 下`);
      }
    }
  }

  if (fileExists("internal/README.md") || fs.existsSync(path.join(repoRoot, "internal"))) {
    failures.push("internal/ 目录应已合并到 docs/，请删除残留 internal/ 入口");
  }

  if (fileExists(".gitignore")) {
    const gitignore = readText(".gitignore");

    for (const ignoreRule of requiredIgnoreRules) {
      if (!gitignore.includes(ignoreRule)) {
        failures.push(`.gitignore 缺少工程文档忽略规则: ${ignoreRule}`);
      }
    }

    if (gitignore.includes("internal/")) {
      failures.push(".gitignore 仍包含 internal/ 规则，请改为 docs/ 对应路径");
    }
  }

  const staleInternalReferencePattern = /\binternal\/(?:aiprompts|exec-plans|roadmap|refactor|test|tests|testing|develop|prd|research)\b/;
  const filesWithStaleReferences = [];

  for (const relativePath of listRepoFiles()) {
    if (!shouldScanFile(relativePath)) {
      continue;
    }

    const source = readText(relativePath);
    if (staleInternalReferencePattern.test(source)) {
      filesWithStaleReferences.push(relativePath);
    }
  }

  if (filesWithStaleReferences.length > 0) {
    failures.push(
      `发现旧 internal/ 工程文档路径引用，请改为 docs/: ${filesWithStaleReferences.join(", ")}`,
    );
  }

  const trackedIgnoredEngineeringDocs = listTrackedIgnoredEngineeringDocs();
  if (trackedIgnoredEngineeringDocs.length > 0) {
    failures.push(
      `发现已进入 Git 索引但应被忽略的 docs 工程文档: ${trackedIgnoredEngineeringDocs.join(", ")}`,
    );
  }

  if (failures.length > 0) {
    console.error("docs 边界检查失败:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("docs 边界检查通过");
}

main();
