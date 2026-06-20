import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { brandMacHelperApps } from "./brand-mac-helper-apps.mjs";
import { PRODUCT_DISPLAY_NAME, PRODUCT_NAME } from "./productIdentity.mjs";

const tmpRoots = [];

function createAppOutDir(helperInfoPlistContent) {
  const root = mkdtempSync(path.join(tmpdir(), "ember-electron-helper-brand-"));
  tmpRoots.push(root);
  const appOutDir = path.join(root, "mac-arm64");
  const mainContents = path.join(
    appOutDir,
    `${PRODUCT_DISPLAY_NAME}.app`,
    "Contents",
  );
  const resourcesDir = path.join(mainContents, "Resources");
  mkdirSync(resourcesDir, { recursive: true });
  const mainInfoPlistPath = path.join(mainContents, "Info.plist");
  writeFileSync(
    mainInfoPlistPath,
    buildInfoPlist([
      ["CFBundleDisplayName", "Ember"],
      ["CFBundleName", "Ember"],
      ["CFBundleExecutable", "Ember"],
      ["CFBundleIdentifier", "com.embercloud.ember"],
      ["CFBundleIconFile", "electron.icns"],
    ]),
  );
  writeFileSync(path.join(resourcesDir, "electron.icns"), "icon");

  const helperContents = path.join(
    appOutDir,
    `${PRODUCT_DISPLAY_NAME}.app`,
    "Contents",
    "Frameworks",
    "Ember Helper (GPU).app",
    "Contents",
  );
  mkdirSync(helperContents, { recursive: true });
  const infoPlistPath = path.join(helperContents, "Info.plist");
  writeFileSync(infoPlistPath, helperInfoPlistContent);
  return { appOutDir, infoPlistPath, mainInfoPlistPath, resourcesDir };
}

function buildInfoPlist(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    "<dict>",
    ...entries.flatMap(([key, value]) => [
      `  <key>${key}</key>`,
      `  <string>${value}</string>`,
    ]),
    "</dict>",
    "</plist>",
  ].join("\n");
}

afterEach(() => {
  while (tmpRoots.length > 0) {
    const root = tmpRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe("brand-electron-mac-helper-apps", () => {
  it("把 macOS helper app Info.plist 中的 Electron Helper 品牌改为 Ember", () => {
    const { appOutDir, infoPlistPath, mainInfoPlistPath } = createAppOutDir(
      buildInfoPlist([
        ["CFBundleDisplayName", "Ember Helper (GPU)"],
        ["CFBundleName", "Electron Helper (GPU)"],
        ["CFBundleExecutable", "Electron Helper (GPU)"],
      ]),
    );

    const result = brandMacHelperApps({
      appOutDir,
      productName: PRODUCT_NAME,
      bundleName: PRODUCT_DISPLAY_NAME,
    });
    const content = readFileSync(infoPlistPath, "utf8");

    expect(result).toEqual([
      expect.objectContaining({
        changed: true,
        infoPlistPath: mainInfoPlistPath,
      }),
      expect.objectContaining({ changed: true, infoPlistPath }),
    ]);
    expect(content).toContain("<string>Ember Helper (GPU)</string>");
    expect(content).not.toContain("Electron Helper");
    const mainContent = readFileSync(mainInfoPlistPath, "utf8");
    expect(mainContent).toContain(`<string>${PRODUCT_DISPLAY_NAME}</string>`);
  });

  it("把主 app 图标 plist 从 Electron 默认名改为 Ember current icon 文件名", () => {
    const { appOutDir, mainInfoPlistPath, resourcesDir } = createAppOutDir(
      buildInfoPlist([
        ["CFBundleDisplayName", "Ember Helper (GPU)"],
        ["CFBundleName", "Ember Helper (GPU)"],
        ["CFBundleExecutable", "Ember Helper (GPU)"],
      ]),
    );

    const result = brandMacHelperApps({
      appOutDir,
      productName: PRODUCT_NAME,
      bundleName: PRODUCT_DISPLAY_NAME,
    });
    const content = readFileSync(mainInfoPlistPath, "utf8");

    expect(result).toContainEqual(
      expect.objectContaining({
        changed: true,
        infoPlistPath: mainInfoPlistPath,
      }),
    );
    expect(content).toContain("<key>CFBundleIconFile</key>");
    expect(content).toContain("<string>icon.icns</string>");
    expect(existsSync(path.join(resourcesDir, "icon.icns"))).toBe(true);
  });

  it("没有 macOS app bundle 时保持空结果", () => {
    const root = mkdtempSync(
      path.join(tmpdir(), "ember-electron-helper-brand-"),
    );
    tmpRoots.push(root);

    expect(
      brandMacHelperApps({ appOutDir: root, productName: "Ember" }),
    ).toEqual([]);
  });
});
