#!/usr/bin/env node
/** Lime → Ember 第三轮：变量名、Rust 类型、扩展、i18n 残留 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SKIP = new Set(["node_modules", ".git", "release-electron", "dist", "dist-electron", "out", "target", "coverage"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".rs", ".toml", ".yml", ".yaml", ".sh", ".rb"]);

const REPLACEMENTS = [
  ["limeTabButtonClassName", "emberTabButtonClassName"],
  ["LimeSessionStore", "EmberSessionStore"],
  ["LimeBridge", "EmberBridge"],
  ["limeBridgeKeepAlive", "emberBridgeKeepAlive"],
  ["LimeSettingsTabs", "EmberSettingsTabs"],
  ["limeHub", "emberHub"],
  ["limeWindow", "emberWindow"],
  ["LIME_GATEWAY", "EMBER_GATEWAY"],
  ["x_lime", "x_ember"],
  ["limenextv2", "embernextv2"],
  ["lime-next", "ember-next"],
  ["limeNext", "emberNext"],
  ["lime_agent", "ember_agent"],
  ["lime.ui", "ember.ui"],
  ["lime.agent", "ember.agent"],
  ["lime.log", "ember.log"],
  ["lime.app-sidebar", "ember.app-sidebar"],
  ["limecloud", "embercloud"],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (SKIP.has(name)) continue;
      walk(full, files);
    } else if (EXT.has(path.extname(name)) && !/rename-lime-to-ember-batch/.test(full)) {
      if (/pnpm-lock\.yaml$|Cargo\.lock$/.test(name)) continue;
      files.push(full);
    }
  }
  return files;
}

function isZhLocaleFile(rel) {
  return /src\/i18n\/resources\/(zh-CN|zh-TW)\//.test(rel);
}

let changed = 0;
for (const filePath of walk(ROOT)) {
  const rel = path.relative(ROOT, filePath);
  const original = fs.readFileSync(filePath, "utf8");
  if (!/lime/i.test(original)) continue;
  let next = original;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  const brand = isZhLocaleFile(rel) ? "熠测" : "Ember";
  next = next.replace(/\bLime\b/g, brand);
  next = next.replace(/\blime\b/g, "ember");
  if (next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    changed += 1;
  }
}
console.log(`Ember 迁移 batch8-final 完成：更新 ${changed} 个文件`);
