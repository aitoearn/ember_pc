#!/usr/bin/env node
/**
 * Lime → Ember 批量文本迁移（P1–P4）
 * 不触碰 lime-rs/、tools/lime-cli/、package.json name
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const TARGET_DIRS = [
  "src",
  "electron",
  "scripts/electron",
  "scripts/agent-app",
  "scripts/connect-deep-link-current-smoke.mjs",
  "scripts/connect-open-deep-link-current-smoke.mjs",
  "scripts/connect-deep-link-save-current-smoke.mjs",
  "scripts/agent-runtime",
  "scripts/smoke",
  "internal/aiprompts/design-language.md",
  "index.css",
  "index.html",
  "forge.config.mjs",
].map((entry) => path.join(ROOT, entry));

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".css",
  ".html",
  ".mjs",
  ".json",
  ".md",
]);

const REPLACEMENTS = [
  ["lime-workbench-surface-scope", "ember-workbench-surface-scope"],
  ["lime-workbench-theme-scope", "ember-workbench-theme-scope"],
  ["lime-settings-theme-scope", "ember-settings-theme-scope"],
  ["lime-color-scheme-changed", "ember-color-scheme-changed"],
  ["lime-theme-changed", "ember-theme-changed"],
  ["lime.appearance.color-scheme", "ember.appearance.color-scheme"],
  ["data-lime-startup-logo", "data-ember-startup-logo"],
  ["data-lime-window", "data-ember-window"],
  ["data-lime-theme-effective", "data-ember-theme-effective"],
  ["data-lime-color-scheme", "data-ember-color-scheme"],
  ["data-lime-theme", "data-ember-theme"],
  ["html[data-lime-window", "html[data-ember-window"],
  ["--lime-", "--ember-"],
  ["lime-literary", "ember-literary"],
  ["lime-classic", "ember-classic"],
  ["lime-minimal", "ember-minimal"],
  ["lime-luxury", "ember-luxury"],
  ["lime-citron", "ember-citron"],
  ["lime-forest", "ember-forest"],
  ["lime-ocean", "ember-ocean"],
  ["lime-neon", "ember-neon"],
  ["lime-vivid", "ember-vivid"],
  ["lime-sand", "ember-sand"],
  ["lime-dusk", "ember-dusk"],
  [
    "syncThemeAccentFromLimeVariables",
    "syncThemeAccentFromEmberVariables",
  ],
  [
    "resolveThemeAccentFromLimeVariables",
    "resolveThemeAccentFromEmberVariables",
  ],
  [
    "LimeColorSchemeChangedEventDetail",
    "EmberColorSchemeChangedEventDetail",
  ],
  ["initializeLimeColorScheme", "initializeEmberColorScheme"],
  ["persistLimeColorScheme", "persistEmberColorScheme"],
  ["applyLimeColorScheme", "applyEmberColorScheme"],
  ["resolveLimeColorSchemeId", "resolveEmberColorSchemeId"],
  ["loadLimeColorSchemeId", "loadEmberColorSchemeId"],
  ["getLimeColorScheme", "getEmberColorScheme"],
  ["DEFAULT_LIME_COLOR_SCHEME_ID", "DEFAULT_EMBER_COLOR_SCHEME_ID"],
  ["LIME_COLOR_SCHEME_CHANGED_EVENT", "EMBER_COLOR_SCHEME_CHANGED_EVENT"],
  ["LIME_COLOR_SCHEME_STORAGE_KEY", "EMBER_COLOR_SCHEME_STORAGE_KEY"],
  ["LIME_COLOR_SCHEMES", "EMBER_COLOR_SCHEMES"],
  ["LimeColorSchemeId", "EmberColorSchemeId"],
  ["LimeColorScheme", "EmberColorScheme"],
  [
    "bindLimeSystemThemeModeListener",
    "bindEmberSystemThemeModeListener",
  ],
  ["initializeLimeThemeMode", "initializeEmberThemeMode"],
  ["persistLimeThemeMode", "persistEmberThemeMode"],
  ["getEffectiveLimeThemeMode", "getEffectiveEmberThemeMode"],
  ["getSystemLimeThemeMode", "getSystemEmberThemeMode"],
  ["applyLimeThemeMode", "applyEmberThemeMode"],
  ["resolveLimeThemeMode", "resolveEmberThemeMode"],
  ["loadLimeThemeMode", "loadEmberThemeMode"],
  ["LimeThemeChangedEventDetail", "EmberThemeChangedEventDetail"],
  ["LimeThemeModeOption", "EmberThemeModeOption"],
  ["LimeEffectiveThemeMode", "EmberEffectiveThemeMode"],
  ["LIME_THEME_MODE_OPTIONS", "EMBER_THEME_MODE_OPTIONS"],
  ["LIME_THEME_CHANGED_EVENT", "EMBER_THEME_CHANGED_EVENT"],
  ["LimeThemeMode", "EmberThemeMode"],
  ["LIME_BRAND_LOGO_SRC", "EMBER_BRAND_LOGO_SRC"],
  ["LIME_BRAND_NAME", "EMBER_BRAND_NAME"],
  ["limeColorScheme", "emberColorScheme"],
  ["limeThemeEffective", "emberThemeEffective"],
  ["limeTheme", "emberTheme"],
  ["LimeColorSchemeEffectiveThemeMode", "EmberColorSchemeEffectiveThemeMode"],
];

function shouldProcessFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stat = fs.statSync(filePath);
  if (stat.isFile()) {
    return EXTENSIONS.has(path.extname(filePath));
  }
  return stat.isDirectory();
}

function walk(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) {
    return files;
  }
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (shouldProcessFile(entryPath)) {
      files.push(entryPath);
    }
    return files;
  }
  for (const name of fs.readdirSync(entryPath)) {
    if (name === "node_modules" || name === "dist" || name === "dist-electron") {
      continue;
    }
    walk(path.join(entryPath, name), files);
  }
  return files;
}

function applyReplacements(content) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  return next;
}

let changedFiles = 0;
let changedReplacements = 0;

for (const target of TARGET_DIRS) {
  for (const filePath of walk(target)) {
    if (filePath.includes(`${path.sep}i18n${path.sep}`)) {
      const rel = path.relative(ROOT, filePath);
      if (!rel.startsWith(`src${path.sep}i18n${path.sep}resources${path.sep}`)) {
        continue;
      }
    }

    const original = fs.readFileSync(filePath, "utf8");
    const updated = applyReplacements(original);
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, "utf8");
      changedFiles += 1;
      changedReplacements += 1;
    }
  }
}

console.log(`Ember 迁移 batch1 完成：更新 ${changedFiles} 个文件`);
