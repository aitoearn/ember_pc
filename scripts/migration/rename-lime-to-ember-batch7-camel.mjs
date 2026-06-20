#!/usr/bin/env node
/** Lime → Ember 第二轮：camelCase / PascalCase 残留 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SKIP_DIR_NAMES = new Set(["node_modules", ".git", "release-electron", "dist", "dist-electron", "out", "target", "coverage"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".html", ".md", ".css", ".rs", ".toml", ".yml", ".yaml", ".sh", ".rb", ".py", ".d.ts"]);

const REPLACEMENTS = [
  ["changeLimeLocale", "changeEmberLocale"],
  ["initLimeI18n", "initEmberI18n"],
  ["getLimeI18n", "getEmberI18n"],
  ["limeI18nResources", "emberI18nResources"],
  ["LimeNamespace", "EmberNamespace"],
  ["LimeCore", "EmberCore"],
  ["limeCore", "emberCore"],
  ["createWithLime", "createWithEmber"],
  ["__lime", "__ember"],
  ["Lime_", "Ember_"],
  ["syncLimeHostTheme", "syncEmberHostTheme"],
  ["applyLimeHostTheme", "applyEmberHostTheme"],
  ["LimeHostTheme", "EmberHostTheme"],
  ["SyncLimeHostTheme", "SyncEmberHostTheme"],
  ["LimeColorScheme", "EmberColorScheme"],
  ["LimeTheme", "EmberTheme"],
  ["LimeRuntime", "EmberRuntime"],
  ["LimeSkills", "EmberSkills"],
  ["LimeHub", "EmberHub"],
  ["LimeDesktop", "EmberDesktop"],
  ["LimeCloud", "EmberCloud"],
  ["Lime API", "Ember API"],
  ["Lime Skills", "Ember Skills"],
  ["Lime Desktop", "Ember Desktop"],
  ["Lime Hub", "Ember Hub"],
  ["Lime Cloud", "Ember Cloud"],
  ["with Lime", "with Ember"],
  ["from Lime", "from Ember"],
  ["Lime has", "Ember has"],
  ["Lime 需要", "Ember 需要"],
  ["Lime 云端", "Ember 云端"],
  ["Lime クラウド", "Ember クラウド"],
  ["Lime 클라우드", "Ember 클라우드"],
  ["Lime cloud", "Ember cloud"],
  ["Lime agent", "Ember agent"],
  ["Lime Agent", "Ember Agent"],
  ["Lime.app", "Ember.app"],
  ["Lime Helper", "Ember Helper"],
  ["# Lime", "# Ember"],
  ["# lime", "# ember"],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      walk(full, files);
    } else if (TEXT_EXTENSIONS.has(path.extname(name))) {
      if (/pnpm-lock\.yaml$|Cargo\.lock$/.test(name)) continue;
      if (/scripts\/migration\/rename-lime-to-ember-batch/.test(full)) continue;
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const filePath of walk(ROOT)) {
  const original = fs.readFileSync(filePath, "utf8");
  if (!/lime/i.test(original)) continue;
  let next = original;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  next = next.replace(/\bLime\b/g, "Ember");
  next = next.replace(/\blime\b/g, "ember");
  if (next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    changed += 1;
  }
}

console.log(`Ember 迁移 batch7-camel 完成：更新 ${changed} 个文件`);
