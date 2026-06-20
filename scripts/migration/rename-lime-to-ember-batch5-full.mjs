#!/usr/bin/env node
/**
 * Ember → Ember 全量机械迁移（batch5）
 * 覆盖 P5：路径、包名、环境变量、协议、Rust crate 名、代码标识符
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "release-electron",
  "dist",
  "dist-electron",
  "out",
  "target",
  "coverage",
  ".mywiki",
  ".pnpm-store",
]);

const SKIP_FILE_PATTERNS = [
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /Cargo\.lock$/,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.webp$/i,
  /\.ico$/i,
  /\.jar$/,
  /\.woff2?$/i,
  /\.ttf$/i,
  /\.mp3$/i,
  /\.mp4$/i,
  /ember@/,
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
  ".rs",
  ".toml",
  ".py",
  ".txt",
  ".d.ts",
  ".env",
  ".env.example",
]);

/** 顺序：长串 / 特殊标识符优先 */
const REPLACEMENTS = [
  ["com.embercloud.ember", "com.embercloud.ember"],
  ["updates.embercloud.com", "updates.embercloud.com"],
  ["github.com/embercloud/ember", "github.com/embercloud/ember"],
  ["@embercloud/", "@embercloud/"],
  ["extensions/ember-chrome", "extensions/ember-chrome"],
  ["packages/ember-cli-npm", "packages/ember-cli-npm"],
  ["tools/ember-cli", "tools/ember-cli"],
  ["ember-rs/crates/ember-cli", "ember-rs/crates/ember-cli"],
  ["ember-rs/", "ember-rs/"],
  ["ember-rs", "ember-rs"],
  [".ember/", ".ember/"],
  [".ember", ".ember"],
  ["EMBER_ELECTRON_FORGE_OUT_DIR", "EMBER_ELECTRON_FORGE_OUT_DIR"],
  ["EMBER_ELECTRON_UPDATES_URL", "EMBER_ELECTRON_UPDATES_URL"],
  ["EMBER_ELECTRON_SIGN", "EMBER_ELECTRON_SIGN"],
  ["EMBER_ELECTRON_RENDERER", "EMBER_ELECTRON_RENDERER"],
  ["EMBER_MACOS_KEYCHAIN", "EMBER_MACOS_KEYCHAIN"],
  ["EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD", "EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD"],
  ["EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE", "EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE"],
  ["EMBER_WINDOWS_SQUIRREL_REMOTE_RELEASES_URL", "EMBER_WINDOWS_SQUIRREL_REMOTE_RELEASES_URL"],
  ["EMBER_UPDATES_BASE_URL", "EMBER_UPDATES_BASE_URL"],
  ["EMBER_", "EMBER_"],
  ["oemEmberHubProvider", "oemEmberHubProvider"],
  ["oemEmberHub", "oemEmberHub"],
  ["OemEmberHub", "OemEmberHub"],
  ["useOemEmberHubProviderSync", "useOemEmberHubProviderSync"],
  ["EmberRuntimeProfile", "EmberRuntimeProfile"],
  ["useEmberSkills", "useEmberSkills"],
  ["emberTaskProtocolNoise", "emberTaskProtocolNoise"],
  ["emberTaskProtocol", "emberTaskProtocol"],
  ["ember_extension_bridge", "ember_extension_bridge"],
  ["ember-layered-design-text-ocr", "ember-layered-design-text-ocr"],
  ["ember_llm_provider", "ember_llm_provider"],
  ["enabled_ember", "enabled_ember"],
  ["emberhub-desktop", "emberhub-desktop"],
  ["emberhub", "emberhub"],
  ["embercorePolicy", "embercorePolicy"],
  ["embercore", "embercore"],
  ["ember-cloud", "ember-cloud"],
  ["ember-cli", "ember-cli"],
  ["ember-chrome", "ember-chrome"],
  ["embercloud", "embercloud"],
  ["ember://", "ember://"],
  ["ember:", "ember:"],
  ["ember.", "ember."],
  ["ember_", "ember_"],
  ["ember-", "ember-"],
  ["/ember/", "/ember/"],
  ["/ember/stable/", "/ember/stable/"],
  ['"name": "ember"', '"name": "ember"'],
  ["'name': 'ember'", "'name': 'ember'"],
  ['name = "ember"', 'name = "ember"'],
  ['SQUIRREL_PACKAGE_NAME = "ember"', 'SQUIRREL_PACKAGE_NAME = "ember"'],
  ['schemes: ["ember"]', 'schemes: ["ember"]'],
  ['"ember": "scripts/run.js"', '"ember": "scripts/run.js"'],
  ["ember agent", "ember agent"],
  ["Ember agent", "Ember agent"],
  ["Ember Agent", "Ember Agent"],
  ["Ember.app", "Ember.app"],
  ["Ember Helper", "Ember Helper"],
  ["Ember-darwin", "Ember-darwin"],
  ["Ember-win32", "Ember-win32"],
  ["PRODUCT_NAME = \"Ember\"", 'PRODUCT_NAME = "Ember"'],
  ["DEFAULT_PRODUCT_NAME = \"Ember\"", 'DEFAULT_PRODUCT_NAME = "Ember"'],
  ["MAC_PRODUCT_NAME = \"Ember\"", 'MAC_PRODUCT_NAME = "Ember"'],
  ["devember", "devember"],
  ["\\bLime\\b", "Ember"],
  ["\\blime\\b", "ember"],
];

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

function applyReplacements(content) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    if (from.startsWith("\\b")) {
      const re = new RegExp(from, "g");
      next = next.replace(re, to);
    } else {
      next = next.split(from).join(to);
    }
  }
  next = next.replaceAll("Ember", "Ember");
  next = next.replaceAll("ember", "ember");
  return next;
}

const files = walk(ROOT);
let changed = 0;

for (const filePath of files) {
  const rel = path.relative(ROOT, filePath);
  if (/scripts\/migration\/rename-ember-to-ember-batch\d+\.mjs$/.test(rel)) {
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  if (!/ember/i.test(original)) continue;

  const updated = applyReplacements(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    changed += 1;
  }
}

console.log(`Ember 迁移 batch5-full 完成：更新 ${changed} 个文件`);
