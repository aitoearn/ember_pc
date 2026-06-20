#!/usr/bin/env node
/**
 * Lime → Ember 用户可见文案迁移（i18n + 品牌常量 + forge 门面）
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const I18N_LOCALES = ["zh-CN", "zh-TW", "en-US", "ja-JP", "ko-KR"];

const SLOGAN_BY_LOCALE = {
  "zh-CN": "Ember 一下，端测即启",
  "zh-TW": "Ember 一下，端測即啟",
  "en-US": "Tap Ember, test every device",
  "ja-JP": "Ember で、端末テストをすぐに",
  "ko-KR": "Ember로, 기기 테스트를 바로",
};

function replaceInFile(filePath, replacer) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const updated = replacer(original);
  if (updated === original) {
    return false;
  }
  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

let changed = 0;

for (const locale of I18N_LOCALES) {
  const commonPath = path.join(
    ROOT,
    "src/i18n/resources",
    locale,
    "common.json",
  );
  if (
    replaceInFile(commonPath, (content) => {
      let next = content.replaceAll("Lime Hub", "Ember Hub");
      next = next.replaceAll("Lime Skills", "Ember Skills");
      next = next.replaceAll("Lime Desktop", "Ember Desktop");
      next = next.replaceAll("Lime API Key", "Ember API Key");
      next = next.replaceAll("Lime 云端", "Ember 云端");
      next = next.replaceAll("Lime クラウド", "Ember クラウド");
      next = next.replaceAll("Lime 클라우드", "Ember 클라우드");
      next = next.replaceAll("Lime cloud", "Ember cloud");
      next = next.replaceAll("Lime ", "Ember ");
      next = next.replaceAll(" Lime", " Ember");
      next = next.replaceAll('"Lime"', '"Ember"');
      const sloganKey = `"common.splashScreen.slogan": `;
      const sloganLine = `${sloganKey}"${SLOGAN_BY_LOCALE[locale]}"`;
      next = next.replace(
        /"common\.splashScreen\.slogan": "[^"]*"/,
        sloganLine,
      );
      return next;
    })
  ) {
    changed += 1;
  }

  const settingsPath = path.join(
    ROOT,
    "src/i18n/resources",
    locale,
    "settings.json",
  );
  if (
    replaceInFile(settingsPath, (content) => {
      return content
        .replaceAll("lime-", "ember-")
        .replaceAll("Lime", "Ember")
        .replaceAll("青柠", "Ember")
        .replaceAll("青檸", "Ember");
    })
  ) {
    changed += 1;
  }
}

const brandingPath = path.join(ROOT, "src/lib/branding.ts");
replaceInFile(brandingPath, (content) =>
  content.replace(
    'export const EMBER_BRAND_NAME = "Lime";',
    'export const EMBER_BRAND_NAME = "Ember";',
  ),
);

const forgePath = path.join(ROOT, "forge.config.mjs");
replaceInFile(forgePath, (content) => {
  let next = content.replace(
    'const PRODUCT_NAME = "Lime";',
    'const PRODUCT_NAME = "Ember";',
  );
  next = next.replaceAll('authors: "Lime"', 'authors: "Ember"');
  next = next.replaceAll('appCopyright: "Copyright © Lime"', 'appCopyright: "Copyright © Ember"');
  next = next.replaceAll('CompanyName: "Lime"', 'CompanyName: "Ember"');
  next = next.replaceAll('name: "Lime URL"', 'name: "Ember URL"');
  next = next.replaceAll("Lime 需要", "Ember 需要");
  return next;
});

replaceInFile(path.join(ROOT, "scripts/electron/brand-mac-helper-apps.mjs"), (c) =>
  c.replace('const DEFAULT_PRODUCT_NAME = "Lime";', 'const DEFAULT_PRODUCT_NAME = "Ember";'),
);
replaceInFile(path.join(ROOT, "scripts/electron/verify-package-resources.mjs"), (c) =>
  c.replace('const MAC_PRODUCT_NAME = "Lime";', 'const MAC_PRODUCT_NAME = "Ember";'),
);

replaceInFile(path.join(ROOT, "index.html"), (content) => {
  let next = content.replaceAll('alt="Lime"', 'alt="Ember"');
  next = next.replaceAll("<title>Lime</title>", "<title>Ember</title>");
  next = next.replace("青柠一下，灵感即来", SLOGAN_BY_LOCALE["zh-CN"]);
  next = next.replace("青檸一下，靈感即來", SLOGAN_BY_LOCALE["zh-TW"]);
  next = next.replace("Tap Lime, inspiration arrives", SLOGAN_BY_LOCALE["en-US"]);
  next = next.replace("Lime で、ひらめきをすぐに", SLOGAN_BY_LOCALE["ja-JP"]);
  next = next.replace("Lime으로, 영감이 바로", SLOGAN_BY_LOCALE["ko-KR"]);
  return next;
});

const srcFiles = [
  "src/i18n/StartupLoadingScreen.tsx",
  "src/i18n/StartupLoadingScreen.test.tsx",
  "src/components/AppSidebar.tsx",
  "src/components/agent/chat/components/MessageList.tsx",
  "src/lib/api/oemCloudControlPlane.ts",
  "src/components/mcp/McpPage.tsx",
  "src/features/agent-app/runtime/hostBridge.ts",
  "src/components/skills/SkillsWorkspacePageViewModel.ts",
  "src/components/agent/chat/workspace/imageTaskPersona.ts",
];

for (const rel of srcFiles) {
  if (
    replaceInFile(path.join(ROOT, rel), (c) => {
      let next = c
        .replaceAll("LIME_BRAND_LOGO_SRC", "EMBER_BRAND_LOGO_SRC")
        .replaceAll("LIME_BRAND_NAME", "EMBER_BRAND_NAME");
      next = next.replaceAll('"Lime"', '"Ember"');
      next = next.replaceAll("'Lime'", "'Ember'");
      next = next.replaceAll("apps.push(\"Lime\")", "apps.push(\"Ember\")");
      return next;
    })
  ) {
    changed += 1;
  }
}

const guardFiles = [
  "scripts/electron/current-entrypoints.test.mjs",
  "scripts/electron/current-docs-guard.test.mjs",
  "scripts/i18n/i18n-app-metadata-locale-build-manifest.test.ts",
  "scripts/i18n/i18n-app-metadata-workflow-report.test.ts",
];

for (const rel of guardFiles) {
  if (
    replaceInFile(path.join(ROOT, rel), (c) =>
      c.replaceAll('const PRODUCT_NAME = "Lime";', 'const PRODUCT_NAME = "Ember";'),
    )
  ) {
    changed += 1;
  }
}

console.log(`Ember 迁移 batch2 完成：更新 ${changed} 个 i18n/品牌文件`);
