#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const REPLACEMENTS = [
  ["syncLimeHostTheme", "syncEmberHostTheme"],
  ["applyLimeHostTheme", "applyEmberHostTheme"],
  ["SyncLimeHostThemeOptions", "SyncEmberHostThemeOptions"],
  ["LimeHostThemeDocumentLike", "EmberHostThemeDocumentLike"],
  ["LimeHostThemeElementLike", "EmberHostThemeElementLike"],
  ["LimeHostThemeSnapshot", "EmberHostThemeSnapshot"],
  ["lime-workbench-tool", "ember-workbench-tool"],
  ['img[alt="Lime"]', 'img[alt="Ember"]'],
  ["img[alt='Lime']", "img[alt='Ember']"],
  ['aria-label="Lime"', 'aria-label="Ember"'],
  ['brand: "Lime"', 'brand: "Ember"'],
  ['brandName: "Lime"', 'brandName: "Ember"'],
  ['name: "Lime"', 'name: "Ember"'],
  ['productName: "Lime"', 'productName: "Ember"'],
  ['title: "Lime"', 'title: "Ember"'],
  ['toContain("Lime")', 'toContain("Ember")'],
  ['tenant: { id: "tenant-0001", name: "Lime" }', 'tenant: { id: "tenant-0001", name: "Ember" }'],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|mjs|md|d\.ts)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const filePath of walk(path.join(ROOT, "src"))) {
  let content = fs.readFileSync(filePath, "utf8");
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  if (next !== content) {
    fs.writeFileSync(filePath, next, "utf8");
    changed += 1;
  }
}

console.log(`Ember 迁移 batch3 完成：更新 ${changed} 个 src 文件`);
