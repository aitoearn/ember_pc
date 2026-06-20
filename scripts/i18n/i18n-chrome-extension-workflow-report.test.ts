import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyzeChromeExtensionWorkflowReport,
  formatChromeExtensionWorkflowReport,
  runCli,
} from "./i18n-chrome-extension-workflow-report";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "ember-i18n-chrome-extension-"),
  );
  tempDirs.push(dir);
  return dir;
}

function writeFile(root: string, relativePath: string, content: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { force: true, recursive: true });
  }
});

describe("i18n chrome extension workflow report", () => {
  it("应识别扩展仍使用 InstallI18n registry 而不是 Chrome _locales", () => {
    const root = createTempDir();
    const extensionRoot = path.join(root, "extensions", "ember-chrome");

    writeFile(
      extensionRoot,
      "manifest.json",
      JSON.stringify(
        {
          action: { default_title: "Ember Browser Bridge" },
          description: "Attach Ember to your browser.",
          manifest_version: 3,
          name: "Ember Browser Bridge",
          version: "0.4.0",
        },
        null,
        2,
      ),
    );
    writeFile(
      extensionRoot,
      "pages/scripts/install-i18n.js",
      "var SUPPORTED = ['zh', 'en', 'de'];\n",
    );
    writeFile(
      extensionRoot,
      "pages/scripts/options.js",
      [
        "const SUPPORTED_LANGUAGES = ['en', 'zh'];",
        "const OPTIONS_TRANSLATIONS = {",
        "  en: { title: 'Ember Browser Connector Relay' },",
        "  zh: { title: 'Ember Browser Connector Relay' },",
        "};",
      ].join("\n"),
    );
    writeFile(
      extensionRoot,
      "pages/options.html",
      [
        '<h1 data-i18n="title">Ember Browser Bridge</h1>',
        '<button data-i18n-title="copy">Copy</button>',
        "<script>InstallI18n.register('en', { title: 'Ember Browser Bridge' });</script>",
        "<script>InstallI18n.register('zh', { title: 'Ember Browser Bridge' });</script>",
      ].join("\n"),
    );
    writeFile(
      extensionRoot,
      "pages/install-extension.html",
      [
        '<p data-i18n="body">Use Ember Agent for Browser Connection.</p>',
        "<script>InstallI18n.register('de', { title: 'Ember Browser Bridge' });</script>",
      ].join("\n"),
    );

    const report = analyzeChromeExtensionWorkflowReport({
      extensionRoot,
      repoRoot: root,
    });

    expect(report.schemaVersion).toBe(
      "ember.i18n.chromeExtensionWorkflowReport.v1",
    );
    expect(report.manifest.hasDefaultLocale).toBe(false);
    expect(report.chromeLocales.localesDirExists).toBe(false);
    expect(report.summary.standardChromeLocaleWorkflowPresent).toBe(false);
    expect(report.summary.standardChromeLocaleDecisionRecorded).toBe(true);
    expect(report.summary.standardChromeLocaleWorkflowRequired).toBe(false);
    expect(report.decision).toEqual(
      expect.objectContaining({
        standardChromeLocaleWorkflowRequired: false,
        status: "deferred",
      }),
    );
    expect(report.summary.installI18nLocaleDriftCount).toBe(0);
    expect(report.summary.optionsLanguageDriftCount).toBe(0);
    expect(report.installI18n.supportedLocales).toEqual(["de", "en", "zh"]);
    expect(report.installI18n.registeredLocales).toEqual(["de", "en", "zh"]);
    expect(report.installI18n.supportedButUnregisteredLocales).toEqual([]);
    expect(report.installI18n.registeredButUnsupportedLocales).toEqual([]);
    expect(report.optionsPage.supportedLanguages).toEqual(["en", "zh"]);
    expect(report.optionsPage.translationLocales).toEqual(["en", "zh"]);
    expect(report.optionsPage.supportedButMissingTranslations).toEqual([]);
    expect(report.optionsPage.translationButUnsupportedLanguages).toEqual([]);
    expect(report.summary.htmlPageCount).toBe(2);
    expect(report.summary.dataI18nAttributeCount).toBe(2);
    const optionsPage = report.pages.find((page) =>
      page.path.endsWith("pages/options.html"),
    );
    expect(optionsPage).toEqual(
      expect.objectContaining({
        dataI18nLikeAttributeCount: 2,
      }),
    );
    expect(
      report.terminology.find((entry) => entry.term === "Ember Browser Bridge")
        ?.present,
    ).toBe(true);
    expect(
      report.terminology.find((entry) => entry.term === "Browser Connection")
        ?.present,
    ).toBe(true);
    expect(formatChromeExtensionWorkflowReport(report, "text")).toContain(
      "[i18n:chrome-extension] workflow inventory",
    );
    expect(formatChromeExtensionWorkflowReport(report, "text")).toContain(
      "standard Chrome locale decision: deferred",
    );
    expect(
      JSON.parse(formatChromeExtensionWorkflowReport(report, "json")),
    ).toEqual(
      expect.objectContaining({
        schemaVersion: "ember.i18n.chromeExtensionWorkflowReport.v1",
      }),
    );
  });

  it("应识别扩展 registry 与 options translation locale 漂移", () => {
    const root = createTempDir();
    const extensionRoot = path.join(root, "extensions", "ember-chrome");

    writeFile(
      extensionRoot,
      "manifest.json",
      JSON.stringify(
        { manifest_version: 3, name: "Ember Browser Bridge" },
        null,
        2,
      ),
    );
    writeFile(
      extensionRoot,
      "pages/scripts/install-i18n.js",
      "var SUPPORTED = ['en', 'zh', 'de'];\n",
    );
    writeFile(
      extensionRoot,
      "pages/scripts/options.js",
      [
        "const SUPPORTED_LANGUAGES = ['en', 'zh'];",
        "const OPTIONS_TRANSLATIONS = {",
        "  en: { title: 'Ember Browser Bridge' },",
        "  pt: { title: 'Ember Browser Bridge' },",
        "};",
      ].join("\n"),
    );
    writeFile(
      extensionRoot,
      "pages/options.html",
      [
        '<h1 data-i18n="title">Ember Browser Bridge</h1>',
        "<script>InstallI18n.register('en', { title: 'Ember Browser Bridge' });</script>",
        "<script>InstallI18n.register('pt', { title: 'Ember Browser Bridge' });</script>",
      ].join("\n"),
    );

    const report = analyzeChromeExtensionWorkflowReport({
      extensionRoot,
      repoRoot: root,
    });

    expect(report.summary.installI18nLocaleDriftCount).toBe(3);
    expect(report.installI18n.supportedButUnregisteredLocales).toEqual([
      "de",
      "zh",
    ]);
    expect(report.installI18n.registeredButUnsupportedLocales).toEqual(["pt"]);
    expect(report.summary.optionsLanguageDriftCount).toBe(2);
    expect(report.optionsPage.supportedButMissingTranslations).toEqual(["zh"]);
    expect(report.optionsPage.translationButUnsupportedLanguages).toEqual([
      "pt",
    ]);
  });

  it("应支持 CLI 写出 JSON", () => {
    const root = createTempDir();
    const extensionRoot = path.join(root, "extensions", "ember-chrome");
    writeFile(
      extensionRoot,
      "manifest.json",
      JSON.stringify(
        { manifest_version: 3, name: "Ember Browser Bridge" },
        null,
        2,
      ),
    );
    writeFile(
      extensionRoot,
      "pages/scripts/install-i18n.js",
      "var SUPPORTED = ['en'];\n",
    );
    writeFile(
      extensionRoot,
      "pages/scripts/options.js",
      "const SUPPORTED_LANGUAGES = ['en'];\n",
    );
    writeFile(
      extensionRoot,
      "pages/options.html",
      '<span data-i18n="title">Ember Browser Bridge</span>\n',
    );

    const outFile = path.join(root, "report.json");
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const exitCode = runCli([
      "--format",
      "json",
      "--repo-root",
      root,
      "--extension-root",
      extensionRoot,
      "--output",
      outFile,
    ]);

    expect(exitCode).toBe(0);
    expect(writeSpy).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(outFile, "utf8"))).toEqual(
      expect.objectContaining({
        schemaVersion: "ember.i18n.chromeExtensionWorkflowReport.v1",
      }),
    );
  });
});
