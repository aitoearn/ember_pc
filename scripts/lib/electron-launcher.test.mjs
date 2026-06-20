import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  brandInfoPlist,
  isBrandedElectronAppReady,
  prepareBrandedElectronApp,
  resolveElectronLaunchPath,
  resolveMacElectronAppBundle,
  spawnElectron,
} from "./electron-launcher.mjs";

const ELECTRON_EXECUTABLE = path.resolve(
  "/repo/ember/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
);

describe("electron launcher", () => {
  it("非 macOS 平台直接使用 Electron 包默认可执行文件", () => {
    const calls = [];
    const child = { once() {} };

    const result = spawnElectron({
      electronPath: "/repo/ember/node_modules/.bin/electron",
      args: ["."],
      env: { NODE_ENV: "test" },
      platform: "linux",
      runner(command, args, options) {
        calls.push({ command, args, options });
        return child;
      },
    });

    expect(result).toBe(child);
    expect(calls).toEqual([
      {
        command: "/repo/ember/node_modules/.bin/electron",
        args: ["."],
        options: {
          env: { NODE_ENV: "test" },
          stdio: "inherit",
          shell: false,
        },
      },
    ]);
  });

  it("macOS 默认解析 branded dev bundle 可执行路径", () => {
    const result = resolveElectronLaunchPath({
      electronPath: ELECTRON_EXECUTABLE,
      platform: "darwin",
      repoRoot: "/repo/ember",
      prepare({ electronPath, repoRoot }) {
        return {
          executablePath: path.join(
            repoRoot,
            ".ember/electron-dev-host/Ember.app/Contents/MacOS",
            path.basename(electronPath),
          ),
        };
      },
    });

    expect(result).toBe(
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/MacOS/Electron",
      ),
    );
  });

  it("允许显式关闭 macOS dev bundle 品牌化", () => {
    expect(
      resolveElectronLaunchPath({
        electronPath: ELECTRON_EXECUTABLE,
        env: { EMBER_ELECTRON_BRAND_DEV_APP: "0" },
        platform: "darwin",
        prepare() {
          throw new Error("should not prepare app bundle");
        },
      }),
    ).toBe(ELECTRON_EXECUTABLE);
  });

  it("从 Electron 可执行文件路径解析 .app bundle 根目录", () => {
    expect(resolveMacElectronAppBundle(ELECTRON_EXECUTABLE)).toBe(
      path.resolve("/repo/ember/node_modules/electron/dist/Electron.app"),
    );
  });

  it("改写 macOS Info.plist 的 Dock/菜单品牌字段", () => {
    const original = [
      '<plist version="1.0">',
      "<dict>",
      "\t<key>CFBundleDisplayName</key>",
      "\t<string>Electron</string>",
      "\t<key>CFBundleName</key>",
      "\t<string>Electron</string>",
      "\t<key>CFBundleExecutable</key>",
      "\t<string>Electron</string>",
      "\t<key>CFBundleIdentifier</key>",
      "\t<string>com.github.Electron</string>",
      "\t<key>CFBundleIconFile</key>",
      "\t<string>electron.icns</string>",
      "\t<key>LSApplicationCategoryType</key>",
      "\t<string>public.app-category.developer-tools</string>",
      "</dict>",
      "</plist>",
    ].join("\n");

    const branded = brandInfoPlist(original);

    expect(branded).toContain(
      "<key>CFBundleDisplayName</key>\n\t<string>Ember</string>",
    );
    expect(branded).toContain(
      "<key>CFBundleName</key>\n\t<string>Ember</string>",
    );
    expect(branded).toContain(
      "<key>CFBundleExecutable</key>\n\t<string>Ember</string>",
    );
    expect(branded).toContain(
      "<key>CFBundleIdentifier</key>\n\t<string>com.embercloud.ember.dev</string>",
    );
    expect(branded).toContain(
      "<key>CFBundleIconFile</key>\n\t<string>icon.icns</string>",
    );
    expect(branded).toContain(
      "<key>LSApplicationCategoryType</key>\n\t<string>public.app-category.productivity</string>",
    );
    expect(branded).not.toContain("<string>Electron</string>");
    expect(branded).not.toContain("com.github.Electron");
    expect(branded).not.toContain("electron.icns");
  });

  it("准备 branded dev bundle 时复制 app、图标并写回 Info.plist", () => {
    const calls = [];
    const written = [];

    const result = prepareBrandedElectronApp({
      electronPath: ELECTRON_EXECUTABLE,
      repoRoot: "/repo/ember",
      copyApp(...args) {
        calls.push(["copyApp", ...args]);
      },
      copyFile(...args) {
        calls.push(["copyFile", ...args]);
      },
      renameFile(...args) {
        calls.push(["renameFile", ...args]);
      },
      fileExists(filePath) {
        const normalized = path.resolve(filePath);
        return (
          normalized.endsWith("icon.icns") ||
          normalized.endsWith("Contents/MacOS/Electron")
        );
      },
      makeDir(...args) {
        calls.push(["makeDir", ...args]);
      },
      readFile() {
        return [
          '<plist version="1.0">',
          "<dict>",
          "\t<key>CFBundleDisplayName</key>",
          "\t<string>Electron</string>",
          "\t<key>CFBundleName</key>",
          "\t<string>Electron</string>",
          "\t<key>CFBundleExecutable</key>",
          "\t<string>Electron</string>",
          "\t<key>CFBundleIdentifier</key>",
          "\t<string>com.github.Electron</string>",
          "\t<key>CFBundleIconFile</key>",
          "\t<string>electron.icns</string>",
          "</dict>",
          "</plist>",
        ].join("\n");
      },
      writeFile(filePath, content) {
        written.push({ filePath, content });
      },
      signApp(appPath) {
        calls.push(["signApp", appPath]);
      },
    });

    expect(result.appPath).toBe(
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember.app"),
    );
    expect(result.executablePath).toBe(
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/MacOS/Ember",
      ),
    );
    expect(calls).toContainEqual([
      "makeDir",
      path.resolve("/repo/ember/.ember/electron-dev-host"),
      { recursive: true },
    ]);
    expect(calls).toContainEqual([
      "copyApp",
      path.resolve("/repo/ember/node_modules/electron/dist/Electron.app"),
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember.app"),
      {
        recursive: true,
        force: true,
        preserveTimestamps: true,
        verbatimSymlinks: true,
      },
    ]);
    expect(calls).toContainEqual([
      "copyFile",
      path.resolve("/repo/ember/ember-rs/icons/icon.icns"),
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/Resources/icon.icns",
      ),
    ]);
    expect(calls).toContainEqual([
      "renameFile",
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/MacOS/Electron",
      ),
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/MacOS/Ember",
      ),
    ]);
    expect(calls).toContainEqual([
      "signApp",
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember.app"),
    ]);
    expect(written).toHaveLength(1);
    expect(written[0].filePath).toBe(
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember.app/Contents/Info.plist",
      ),
    );
    expect(written[0].content).toContain("<string>Ember</string>");
    expect(written[0].content).toContain(
      "<key>CFBundleExecutable</key>\n\t<string>Ember</string>",
    );
    expect(written[0].content).not.toContain("com.github.Electron");
  });

  it("历史 Ember.app 缓存不可用时改用稳定的 Ember-dev.app fallback", () => {
    const calls = [];
    const written = [];
    const existing = new Set([
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember.app"),
      path.resolve("/repo/ember/ember-rs/icons/icon.icns"),
    ]);

    const result = prepareBrandedElectronApp({
      electronPath: ELECTRON_EXECUTABLE,
      repoRoot: "/repo/ember",
      copyApp(...args) {
        calls.push(["copyApp", ...args]);
      },
      copyFile(...args) {
        calls.push(["copyFile", ...args]);
      },
      renameFile(...args) {
        calls.push(["renameFile", ...args]);
      },
      fileExists(filePath) {
        const normalized = path.resolve(filePath);
        return (
          existing.has(normalized) ||
          normalized.endsWith("Ember-dev.app/Contents/MacOS/Electron")
        );
      },
      makeDir(...args) {
        calls.push(["makeDir", ...args]);
      },
      readFile() {
        return "<plist><dict></dict></plist>";
      },
      writeFile(filePath, content) {
        written.push({ filePath, content });
      },
      signApp(appPath) {
        calls.push(["signApp", appPath]);
      },
    });

    expect(result.appPath).toBe(
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember-dev.app"),
    );
    expect(result.executablePath).toBe(
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember-dev.app/Contents/MacOS/Ember",
      ),
    );
    expect(calls).toContainEqual([
      "copyApp",
      path.resolve("/repo/ember/node_modules/electron/dist/Electron.app"),
      path.resolve("/repo/ember/.ember/electron-dev-host/Ember-dev.app"),
      {
        recursive: true,
        force: true,
        preserveTimestamps: true,
        verbatimSymlinks: true,
      },
    ]);
    expect(written[0].filePath).toBe(
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember-dev.app/Contents/Info.plist",
      ),
    );
    expect(calls).toContainEqual([
      "renameFile",
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember-dev.app/Contents/MacOS/Electron",
      ),
      path.resolve(
        "/repo/ember/.ember/electron-dev-host/Ember-dev.app/Contents/MacOS/Ember",
      ),
    ]);
  });

  it("branded dev bundle ready 判断会拒绝指向源 Electron.app 的 framework symlink", () => {
    const appPath = path.resolve("/repo/ember/.ember/electron-dev-host/Ember.app");
    const infoPlistPath = path.join(appPath, "Contents/Info.plist");
    const executablePath = path.join(appPath, "Contents/MacOS/Ember");
    const requiredResourcePath = path.join(
      appPath,
      "Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/icudtl.dat",
    );

    const ready = isBrandedElectronAppReady({
      appPath,
      executablePath,
      infoPlistPath,
      fileExists(filePath) {
        return [executablePath, infoPlistPath, requiredResourcePath].includes(
          path.resolve(filePath),
        );
      },
      readFile() {
        return [
          "<plist><dict>",
          "<key>CFBundleDisplayName</key><string>Ember</string>",
          "<key>CFBundleName</key><string>Ember</string>",
          "<key>CFBundleExecutable</key><string>Ember</string>",
          "<key>CFBundleIdentifier</key><string>com.embercloud.ember.dev</string>",
          "<key>CFBundleIconFile</key><string>icon.icns</string>",
          "</dict></plist>",
        ].join("");
      },
      readLink(filePath) {
        if (String(filePath).endsWith("Versions/Current")) {
          return "A";
        }
        if (String(filePath).endsWith("Resources")) {
          return path.resolve(
            "/repo/ember/node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/Current/Resources",
          );
        }
        return "Versions/Current/Electron Framework";
      },
    });

    expect(ready).toBe(false);
  });

  it("branded dev bundle ready 判断接受完整相对 framework symlink", () => {
    const appPath = path.resolve(
      "/repo/ember/.ember/electron-dev-host/Ember-dev.app",
    );
    const infoPlistPath = path.join(appPath, "Contents/Info.plist");
    const executablePath = path.join(appPath, "Contents/MacOS/Ember");
    const requiredResourcePath = path.join(
      appPath,
      "Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/icudtl.dat",
    );

    const ready = isBrandedElectronAppReady({
      appPath,
      executablePath,
      infoPlistPath,
      fileExists(filePath) {
        return [executablePath, infoPlistPath, requiredResourcePath].includes(
          path.resolve(filePath),
        );
      },
      readFile() {
        return [
          "<plist><dict>",
          "<key>CFBundleDisplayName</key><string>Ember</string>",
          "<key>CFBundleName</key><string>Ember</string>",
          "<key>CFBundleExecutable</key><string>Ember</string>",
          "<key>CFBundleIdentifier</key><string>com.embercloud.ember.dev</string>",
          "<key>CFBundleIconFile</key><string>icon.icns</string>",
          "</dict></plist>",
        ].join("");
      },
      readLink(filePath) {
        if (String(filePath).endsWith("Versions/Current")) {
          return "A";
        }
        if (String(filePath).endsWith("Resources")) {
          return "Versions/Current/Resources";
        }
        return "Versions/Current/Electron Framework";
      },
    });

    expect(ready).toBe(true);
  });
});
