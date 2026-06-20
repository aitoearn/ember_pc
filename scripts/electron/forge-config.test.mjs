import { describe, expect, it } from "vitest";

import forgeConfig, {
  ignorePackagerInput,
  macDmgConfig,
  macDmgContents,
  macNotarizeOptions,
  macSignOptions,
  macZipConfig,
  squirrelConfig,
  updateFeedLabel,
  updateFeedUrl,
  windowsSigningOptions,
  windowsSquirrelRemoteReleasesOptions,
  windowsSquirrelRemoteReleasesUrl,
} from "../../forge.config.mjs";
import {
  PRODUCT_DISPLAY_NAME,
  PRODUCT_NAME,
} from "./productIdentity.mjs";

describe("Electron Forge config", () => {
  it("keeps Forge official makers as the packaging fact source", () => {
    expect(forgeConfig.outDir).toBe(
      process.env.EMBER_ELECTRON_FORGE_OUT_DIR || "release-electron",
    );
    expect(forgeConfig.makers.map((maker) => maker.name)).toEqual([
      "dmg",
      "zip",
      "squirrel",
    ]);
    expect(forgeConfig.makers[0].platformsToMakeOn).toEqual(["darwin"]);
    expect(forgeConfig.makers[1].platformsToMakeOn).toEqual(["darwin"]);
    expect(forgeConfig.makers[2].platformsToMakeOn).toEqual(["win32"]);
  });

  it("builds macOS signing and notarization options only from GitHub Actions env", () => {
    const env = {
      APPLE_ID: "release@example.com",
      APPLE_PASSWORD: "app-specific-password",
      APPLE_SIGNING_IDENTITY: "Developer ID Application: Ember",
      APPLE_TEAM_ID: "TEAM123456",
      EMBER_ELECTRON_SIGN: "1",
      EMBER_MACOS_KEYCHAIN: "/tmp/ember.keychain-db",
    };

    expect(macSignOptions({ env, platform: "darwin" })).toEqual({
      continueOnError: false,
      identity: "Developer ID Application: Ember",
      identityValidation: true,
      keychain: "/tmp/ember.keychain-db",
      optionsForFile: expect.any(Function),
      preAutoEntitlements: false,
      preEmbedProvisioningProfile: false,
      strictVerify: true,
    });
    expect(
      macSignOptions({ env, platform: "darwin" }).optionsForFile(
        "release-electron/熠测-darwin-arm64/熠测.app",
      ),
    ).toEqual({
      entitlements: "ember-rs/entitlements.plist",
      hardenedRuntime: true,
      signatureFlags: ["runtime"],
    });
    expect(
      macSignOptions({ env, platform: "darwin" }).optionsForFile(
        "release-electron/熠测-darwin-arm64/熠测.app/Contents/MacOS/Ember",
      ),
    ).toBeNull();
    expect(macNotarizeOptions({ env, platform: "darwin" })).toEqual({
      appleId: "release@example.com",
      appleIdPassword: "app-specific-password",
      teamId: "TEAM123456",
    });
    expect(macSignOptions({ env, platform: "win32" })).toBeUndefined();
    expect(
      macNotarizeOptions({
        env: { ...env, APPLE_PASSWORD: "" },
        platform: "darwin",
      }),
    ).toBeUndefined();
  });

  it("runs macOS branding before signing and notarization", () => {
    expect(forgeConfig.packagerConfig.afterComplete).toBeUndefined();
    expect(forgeConfig.packagerConfig.afterCopyExtraResources).toHaveLength(1);
    expect(
      forgeConfig.packagerConfig.afterCopyExtraResources[0].length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("packages device automation resources with Forge extraResource", () => {
    expect(forgeConfig.packagerConfig.extraResource).toContain(
      "dist-electron/device-automation",
    );
  });

  it("uses Ember-branded DMG background instead of electron-installer-dmg default", () => {
    const dmgConfig = macDmgConfig();
    expect(dmgConfig.background).toBe("resources/electron/dmg-background.png");
    expect(dmgConfig.icon).toBe("ember-rs/icons/icon.icns");
    expect(dmgConfig.name).toBe(PRODUCT_DISPLAY_NAME);
    expect(dmgConfig.title).toBe(PRODUCT_DISPLAY_NAME);
    expect(forgeConfig.packagerConfig.name).toBe(PRODUCT_DISPLAY_NAME);
    expect(forgeConfig.packagerConfig.executableName).toBe(PRODUCT_NAME);
    expect(dmgConfig.iconSize).toBe(104);
    expect(forgeConfig.packagerConfig.extendInfo?.CFBundleDisplayName).toBe(
      PRODUCT_DISPLAY_NAME,
    );
    expect(dmgConfig.additionalDMGOptions?.["background-color"]).toBe("#f7fbf4");
    expect(dmgConfig.additionalDMGOptions?.window?.size).toEqual({
      width: 520,
      height: 340,
    });
    const contents = macDmgContents({ appPath: "/tmp/熠测.app" });
    expect(contents).toEqual([
      { x: 392, y: 160, type: "link", path: "/Applications" },
      { x: 128, y: 160, type: "file", path: "/tmp/熠测.app" },
    ]);
  });

  it("builds updater feed URLs from explicit env or platform feed labels", () => {
    expect(updateFeedLabel("darwin", "arm64")).toBe("darwin-arm64");
    expect(updateFeedLabel("darwin", "x64")).toBe("darwin-x64");
    expect(updateFeedLabel("win32", "x64")).toBe("win32-x64");
    expect(
      updateFeedUrl("darwin", "arm64", {
        env: { EMBER_UPDATES_BASE_URL: "https://updates.example/" },
      }),
    ).toBe("https://updates.example/ember/stable/darwin-arm64");
    expect(
      updateFeedUrl("win32", "x64", {
        env: { EMBER_ELECTRON_UPDATES_URL: "https://feed.example/win32-x64/" },
      }),
    ).toBe("https://feed.example/win32-x64");
    expect(
      macZipConfig("x64", {
        env: { EMBER_UPDATES_BASE_URL: "https://updates.example" },
      }),
    ).toEqual({
      macUpdateManifestBaseUrl:
        "https://updates.example/ember/stable/darwin-x64",
    });
  });

  it("maps Windows GitHub Actions PFX env into Forge Squirrel signing config", () => {
    const env = {
      EMBER_ELECTRON_SIGN: "1",
      EMBER_UPDATES_BASE_URL: "https://updates.example/",
      EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE: " C:/certs/ember.pfx ",
      EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD: "secret",
    };

    expect(windowsSigningOptions({ env, platform: "win32" })).toEqual({
      certificateFile: "C:/certs/ember.pfx",
      certificatePassword: "secret",
    });
    expect(
      squirrelConfig("x64", {
        env,
        packageVersion: "9.8.7",
        platform: "win32",
      }),
    ).toEqual({
      authors: "Ember",
      certificateFile: "C:/certs/ember.pfx",
      certificatePassword: "secret",
      exe: "Ember.exe",
      name: "ember",
      noMsi: true,
      setupExe: "Ember-9.8.7 Setup.exe",
      setupIcon: "ember-rs/icons/icon.ico",
    });
    expect(windowsSigningOptions({ env, platform: "darwin" })).toEqual({});
  });

  it("keeps Windows Squirrel signing optional but paired", () => {
    expect(
      windowsSigningOptions({
        env: {
          EMBER_ELECTRON_SIGN: "1",
          EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE: "",
          EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD: "",
        },
        platform: "win32",
      }),
    ).toEqual({});
    expect(
      squirrelConfig("x64", {
        env: {
          EMBER_ELECTRON_SIGN: "1",
          EMBER_UPDATES_BASE_URL: "https://updates.example",
        },
        packageVersion: "9.8.7",
        platform: "win32",
      }),
    ).not.toHaveProperty("certificateFile");
    expect(
      windowsSigningOptions({
        env: {
          EMBER_ELECTRON_SIGN: "1",
          EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE: "C:/certs/ember.pfx",
          EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD: "",
        },
        platform: "win32",
      }),
    ).toEqual({});
  });

  it("keeps Windows Squirrel remote release sync opt-in", () => {
    const env = {
      EMBER_ELECTRON_UPDATES_URL: "https://feed.example/win32-x64/",
      EMBER_UPDATES_BASE_URL: "https://updates.example/",
      EMBER_WINDOWS_SQUIRREL_REMOTE_RELEASES_URL:
        " https://updates.example/ember/stable/win32-x64/ ",
    };

    expect(windowsSquirrelRemoteReleasesUrl({ env: {} })).toBeUndefined();
    expect(windowsSquirrelRemoteReleasesUrl({ env })).toBe(
      "https://updates.example/ember/stable/win32-x64",
    );
    expect(windowsSquirrelRemoteReleasesOptions({ env })).toEqual({
      remoteReleases: "https://updates.example/ember/stable/win32-x64",
    });
    expect(
      squirrelConfig("x64", {
        env: { EMBER_ELECTRON_UPDATES_URL: "https://feed.example/win32-x64/" },
        packageVersion: "9.8.7",
        platform: "win32",
      }),
    ).not.toHaveProperty("remoteReleases");
    expect(
      squirrelConfig("x64", {
        env,
        packageVersion: "9.8.7",
        platform: "win32",
      }),
    ).toMatchObject({
      remoteReleases: "https://updates.example/ember/stable/win32-x64",
    });
  });

  it("keeps required packaged app inputs while ignoring repository-only sources", () => {
    expect(ignorePackagerInput(`${process.cwd()}/package.json`)).toBe(false);
    expect(ignorePackagerInput(`${process.cwd()}/dist/index.html`)).toBe(false);
    expect(ignorePackagerInput(`${process.cwd()}/dist-electron/main`)).toBe(
      false,
    );
    expect(
      ignorePackagerInput(`${process.cwd()}/dist-electron/preload/index.js`),
    ).toBe(false);
    expect(ignorePackagerInput(`${process.cwd()}/src/App.tsx`)).toBe(true);
    expect(
      ignorePackagerInput(`${process.cwd()}/scripts/electron/smoke.mjs`),
    ).toBe(true);
  });

  it("excludes pnpm devDependency hoists and Vite prebundle cache from app.asar", () => {
    expect(
      ignorePackagerInput(`${process.cwd()}/node_modules/.ignored/electron`),
    ).toBe(true);
    expect(
      ignorePackagerInput(
        `${process.cwd()}/node_modules/.ignored/typescript/lib/typescript.js`,
      ),
    ).toBe(true);
    expect(
      ignorePackagerInput(
        `${process.cwd()}/node_modules/.vite-electron/deps/react.js`,
      ),
    ).toBe(true);
    expect(
      ignorePackagerInput(`${process.cwd()}/node_modules/react/index.js`),
    ).toBe(false);
  });
});
