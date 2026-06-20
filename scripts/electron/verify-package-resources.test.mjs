import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  verifyDeviceAutomationResources,
  verifyMacAppIdentity,
} from "./verify-package-resources.mjs";

import {
  PRODUCT_DISPLAY_NAME,
  PRODUCT_NAME,
} from "./productIdentity.mjs";

const tmpRoots = [];

function createPackageRoot(infoPlistContent, helperInfoPlists = []) {
  const root = mkdtempSync(path.join(tmpdir(), "ember-electron-package-"));
  tmpRoots.push(root);
  const appContents = path.join(
    root,
    "mac-arm64",
    `${PRODUCT_DISPLAY_NAME}.app`,
    "Contents",
  );
  mkdirSync(appContents, { recursive: true });
  writeFileSync(path.join(appContents, "Info.plist"), infoPlistContent);
  for (const [helperName, helperInfoPlistContent] of helperInfoPlists) {
    const helperContents = path.join(
      appContents,
      "Frameworks",
      helperName,
      "Contents",
    );
    mkdirSync(helperContents, { recursive: true });
    writeFileSync(
      path.join(helperContents, "Info.plist"),
      helperInfoPlistContent,
    );
  }
  return root;
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

function cleanLimeInfoPlist(extraEntries = []) {
  return buildInfoPlist([
    ["CFBundleDisplayName", PRODUCT_DISPLAY_NAME],
    ["CFBundleName", PRODUCT_DISPLAY_NAME],
    ["CFBundleExecutable", PRODUCT_NAME],
    ["CFBundleIdentifier", "com.embercloud.ember"],
    ["CFBundleIconFile", "icon.icns"],
    ...extraEntries,
  ]);
}

function cleanHelperInfoPlist(suffix = " (GPU)", extraEntries = []) {
  return buildInfoPlist([
    ["CFBundleDisplayName", `Ember Helper${suffix}`],
    ["CFBundleName", `Ember Helper${suffix}`],
    ["CFBundleExecutable", `Ember Helper${suffix}`],
    [
      "CFBundleIdentifier",
      `com.embercloud.ember.helper${suffix.replace(/[ ()]/g, "")}`,
    ],
    ...extraEntries,
  ]);
}

afterEach(() => {
  while (tmpRoots.length > 0) {
    const root = tmpRoots.pop();
    rmSync(root, { recursive: true, force: true });
  }
});

describe("verify-electron-package-resources macOS app identity", () => {
  it("接受完整 macOS app identity（中文显示名 + 英文可执行名）", () => {
    const root = createPackageRoot(cleanLimeInfoPlist());

    expect(verifyMacAppIdentity(root, { platform: "darwin" })).toEqual([
      expect.objectContaining({ kind: "main" }),
    ]);
  });

  it("接受 Ember helper app identity，不把 helper 名称误判成主 app", () => {
    const root = createPackageRoot(cleanLimeInfoPlist(), [
      ["Ember Helper (GPU).app", cleanHelperInfoPlist(" (GPU)")],
    ]);

    expect(verifyMacAppIdentity(root, { platform: "darwin" })).toEqual([
      expect.objectContaining({ kind: "main" }),
      expect.objectContaining({ kind: "helper" }),
    ]);
  });

  it("拒绝仍使用 Electron 可执行名的 macOS app", () => {
    const root = createPackageRoot(
      cleanLimeInfoPlist([["CFBundleExecutable", "Electron"]]),
    );

    expect(() => verifyMacAppIdentity(root, { platform: "darwin" })).toThrow(
      /executable still uses Electron/,
    );
  });

  it("拒绝 Forge packager extendInfo 字符串污染出的数字键", () => {
    const root = createPackageRoot(cleanLimeInfoPlist([["0", "l"]]));

    expect(() => verifyMacAppIdentity(root, { platform: "darwin" })).toThrow(
      /numeric extendInfo keys/,
    );
  });

  it("拒绝 helper app 中残留的 Electron Helper 品牌", () => {
    const root = createPackageRoot(cleanLimeInfoPlist(), [
      [
        "Ember Helper (GPU).app",
        cleanHelperInfoPlist(" (GPU)", [
          ["CFBundleName", "Electron Helper (GPU)"],
        ]),
      ],
    ]);

    expect(() => verifyMacAppIdentity(root, { platform: "darwin" })).toThrow(
      /helper app identity still uses Electron/,
    );
  });

  it("非 macOS 平台不检查 macOS app identity", () => {
    const root = createPackageRoot(
      cleanLimeInfoPlist([["CFBundleExecutable", "Electron"]]),
    );

    expect(verifyMacAppIdentity(root, { platform: "win32" })).toEqual([]);
  });
});

describe("verify-electron-package-resources device automation", () => {
  it("接受已暂存的 scrcpy server 资源", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ember-electron-resources-"));
    tmpRoots.push(root);
    const resourceDir = path.join(root, "device-automation");
    mkdirSync(resourceDir, { recursive: true });
    writeFileSync(path.join(resourceDir, "scrcpy.jar"), "jar");
    mkdirSync(
      path.join(
        resourceDir,
        "agent-device",
        "dist",
        "src",
        "internal",
      ),
      { recursive: true },
    );
    mkdirSync(path.join(resourceDir, "agent-device", "bin"), {
      recursive: true,
    });
    mkdirSync(path.join(resourceDir, "agent-device", "node_modules", "yaml"), {
      recursive: true,
    });
    writeFileSync(
      path.join(resourceDir, "agent-device", "package.json"),
      "{}",
    );
    writeFileSync(
      path.join(resourceDir, "agent-device", "bin", "agent-device.mjs"),
      "bin",
    );
    writeFileSync(
      path.join(
        resourceDir,
        "agent-device",
        "dist",
        "src",
        "internal",
        "bin.js",
      ),
      "dist",
    );
    writeFileSync(
      path.join(
        resourceDir,
        "agent-device",
        "node_modules",
        "yaml",
        "package.json",
      ),
      "{}",
    );
    writeFileSync(
      path.join(resourceDir, "manifest.json"),
      JSON.stringify({
        resources: {
          scrcpyServer: {
            status: "staged",
            path: "scrcpy.jar",
          },
          agentDevice: {
            status: "staged",
            path: "agent-device",
          },
        },
      }),
    );

    expect(() => verifyDeviceAutomationResources(root)).not.toThrow();
  });

  it("拒绝缺失 scrcpy server 的设备自动化资源", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ember-electron-resources-"));
    tmpRoots.push(root);
    const resourceDir = path.join(root, "device-automation");
    mkdirSync(resourceDir, { recursive: true });
    writeFileSync(
      path.join(resourceDir, "manifest.json"),
      JSON.stringify({
        resources: {
          scrcpyServer: {
            status: "missing",
            path: "scrcpy.jar",
            reason: "未下载",
          },
        },
      }),
    );

    expect(() => verifyDeviceAutomationResources(root)).toThrow(
      /scrcpyServer is not staged/,
    );
  });
});
