#!/usr/bin/env node
/**
 * Lime → Ember 全量品牌文案迁移（batch4）
 * - 用户可见字符串中的 \bLime\b
 * - zh-CN / zh-TW i18n 使用「熠测」
 * - 不改动：lime-rs/ 路径、com.limecloud.*、oemLime* 标识符、URL 域名
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "release-electron",
  "dist",
  "out",
  "target",
  "coverage",
  ".mywiki",
]);

const SKIP_FILE_PATTERNS = [
  /scripts\/migration\/rename-lime-to-ember-batch\d+\.mjs$/,
  /package-lock\.json$/,
  /\.png$/i,
  /\.jpg$/i,
  /\.jar$/,
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".md",
  ".css",
  ".xml",
  ".svg",
  ".plist",
  ".rb",
  ".yml",
  ".yaml",
  ".ps1",
  ".sh",
]);

function shouldSkipFile(relPath) {
  return SKIP_FILE_PATTERNS.some((pattern) => pattern.test(relPath));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      walk(full, files);
    } else {
      const ext = path.extname(name);
      if (!TEXT_EXTENSIONS.has(ext)) continue;
      if (shouldSkipFile(rel)) continue;
      files.push(full);
    }
  }
  return files;
}

function isZhLocaleFile(relPath) {
  return /src\/i18n\/resources\/(zh-CN|zh-TW)\//.test(relPath);
}

function isLegacyZhPatch(relPath) {
  return relPath.endsWith("src/i18n/legacy-patch/patches/zh.json");
}

function replaceBrandInContent(content, { zh = false } = {}) {
  const brand = zh ? "熠测" : "Ember";
  let next = content;

  const phraseReplacements = zh
    ? [
        ["Lime Cloud", "熠测云端"],
        ["Lime 云端", "熠测云端"],
        ["Lime 雲端", "熠测云端"],
        ["Lime 首页", "熠测首页"],
        ["Lime 首頁", "熠测首页"],
        ["Lime Home", "熠测首页"],
        ["Lime Skills", "Ember Skills"],
        ["Lime Desktop", "Ember Desktop"],
        ["Lime Hub", "Ember Hub"],
        ["Lime API Key", "Ember API Key"],
        ["@Lime", "@Ember"],
        ["Lime AI", "熠测 AI"],
      ]
    : [
        ["Lime Cloud", "Ember Cloud"],
        ["Lime 云端", "Ember Cloud"],
        ["Lime Skills", "Ember Skills"],
        ["Lime Desktop", "Ember Desktop"],
        ["Lime Hub", "Ember Hub"],
        ["Lime API Key", "Ember API Key"],
        ["@Lime", "@Ember"],
        ["Lime's", "Ember's"],
        ["Lime AI", "Ember AI"],
      ];

  for (const [from, to] of phraseReplacements) {
    next = next.split(from).join(to);
  }

  next = next.replace(/\bLime\b/g, brand);
  return next;
}

const scanRoots = [
  "src",
  "electron",
  "scripts",
  "extensions",
  "packages",
  "lime-rs/capabilities",
  "public",
  "homebrew",
  "index.html",
  "forge.config.mjs",
  "README.md",
  "README.en.md",
  "RELEASE_NOTES.md",
  "RELEASE_NOTES.en.md",
  "AGENTS.md",
  "internal",
  "docs",
  "Makefile",
].map((rel) => path.join(ROOT, rel));

let changed = 0;
const changedFiles = [];

for (const rootEntry of scanRoots) {
  const entries = fs.existsSync(rootEntry)
    ? fs.statSync(rootEntry).isDirectory()
      ? walk(rootEntry)
      : [rootEntry]
    : [];

  for (const filePath of entries) {
    const rel = path.relative(ROOT, filePath);
    const original = fs.readFileSync(filePath, "utf8");
    if (!/\bLime\b/.test(original)) continue;

    const updated = replaceBrandInContent(original, {
      zh: isZhLocaleFile(rel) || isLegacyZhPatch(rel),
    });

    if (updated !== original) {
      fs.writeFileSync(filePath, updated, "utf8");
      changed += 1;
      changedFiles.push(rel);
    }
  }
}

console.log(`Ember 迁移 batch4 完成：更新 ${changed} 个文件`);
for (const rel of changedFiles.slice(0, 40)) {
  console.log(`  - ${rel}`);
}
if (changedFiles.length > 40) {
  console.log(`  ... 另有 ${changedFiles.length - 40} 个文件`);
}
