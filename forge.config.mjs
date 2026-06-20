import path from "node:path";
import { readFileSync } from "node:fs";

import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";

import { brandMacHelperApps } from "./scripts/electron/brand-mac-helper-apps.mjs";
import {
  PRODUCT_DISPLAY_NAME,
  PRODUCT_NAME,
} from "./scripts/electron/productIdentity.mjs";

const APP_ID = "com.embercloud.ember";
const RELEASE_OUTPUT_DIR =
  process.env.EMBER_ELECTRON_FORGE_OUT_DIR || "release-electron";
const SQUIRREL_PACKAGE_NAME = "ember";
const PACKAGE_VERSION = JSON.parse(
  readFileSync("package.json", "utf8"),
).version;
const DEFAULT_UPDATE_BASE_URL = "https://updates.aiearn.me";
const MACOS_APP_ENTITLEMENTS = "ember-rs/entitlements.plist";

const retainedPackageRoots = new Set(["dist", "node_modules", "package.json"]);
const retainedPackageDirectories = new Set([
  "dist-electron",
  "dist-electron/main",
  "dist-electron/preload",
]);
const retainedPackagePrefixes = [
  "dist-electron/main/",
  "dist-electron/preload/",
];
const ignoredNodeModulesPaths = new Set([
  "node_modules/.ignored",
  "node_modules/.vite-electron",
]);
const ignoredNodeModulesPrefixes = [
  "node_modules/.ignored/",
  "node_modules/.vite-electron/",
];

function ignorePackagerInput(filePath) {
  const normalizedInput = filePath.replace(/\\/g, "/");
  const normalizedCwd = process.cwd().replace(/\\/g, "/");
  const relativePath =
    normalizedInput === normalizedCwd ||
    normalizedInput.startsWith(`${normalizedCwd}/`)
      ? path.relative(process.cwd(), filePath)
      : normalizedInput;
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) {
    return false;
  }

  if (
    ignoredNodeModulesPaths.has(normalized) ||
    ignoredNodeModulesPrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    return true;
  }

  const root = normalized.split("/")[0];
  if (retainedPackageRoots.has(root)) {
    return false;
  }
  if (retainedPackageDirectories.has(normalized)) {
    return false;
  }
  if (retainedPackagePrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  return true;
}

function isTopLevelAppBundle(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  return normalized.endsWith(".app") && !normalized.includes(".app/");
}

function macSignOptions({
  env = process.env,
  platform = process.platform,
} = {}) {
  if (
    platform !== "darwin" ||
    (env.EMBER_ELECTRON_SIGN !== "1" && !env.EMBER_MACOS_KEYCHAIN)
  ) {
    return undefined;
  }

  const options = {
    continueOnError: false,
    identityValidation: true,
    preAutoEntitlements: false,
    preEmbedProvisioningProfile: false,
    optionsForFile: (filePath) => {
      if (!isTopLevelAppBundle(filePath)) {
        return null;
      }
      return {
        entitlements: MACOS_APP_ENTITLEMENTS,
        hardenedRuntime: true,
        signatureFlags: ["runtime"],
      };
    },
    strictVerify: true,
  };
  if (env.APPLE_SIGNING_IDENTITY) {
    options.identity = env.APPLE_SIGNING_IDENTITY;
  }
  if (env.EMBER_MACOS_KEYCHAIN) {
    options.keychain = env.EMBER_MACOS_KEYCHAIN;
  }
  return options;
}

function macNotarizeOptions({
  env = process.env,
  platform = process.platform,
} = {}) {
  if (
    platform !== "darwin" ||
    (env.EMBER_ELECTRON_SIGN !== "1" && !env.EMBER_MACOS_KEYCHAIN)
  ) {
    return undefined;
  }

  const appleId = env.APPLE_ID;
  const appleIdPassword = env.APPLE_APP_SPECIFIC_PASSWORD || env.APPLE_PASSWORD;
  const teamId = env.APPLE_TEAM_ID;
  if (!appleId || !appleIdPassword || !teamId) {
    return undefined;
  }

  return { appleId, appleIdPassword, teamId };
}

function normalizedUpdateBaseUrl({ env = process.env } = {}) {
  return (env.EMBER_UPDATES_BASE_URL || DEFAULT_UPDATE_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function updateFeedLabel(platform = process.platform, arch = process.arch) {
  if (platform === "darwin") {
    return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  if (platform === "win32") {
    return arch === "arm64" ? "win32-arm64" : "win32-x64";
  }
  return `${platform}-${arch}`;
}

function updateFeedUrl(
  platform = process.platform,
  arch = process.arch,
  { env = process.env } = {},
) {
  const explicitFeedUrl = env.EMBER_ELECTRON_UPDATES_URL?.trim();
  if (explicitFeedUrl) {
    return explicitFeedUrl.replace(/\/+$/, "");
  }
  return `${normalizedUpdateBaseUrl({ env })}/ember/stable/${updateFeedLabel(platform, arch)}`;
}

function macZipConfig(arch = process.arch, options = {}) {
  return {
    macUpdateManifestBaseUrl: updateFeedUrl("darwin", arch, options),
  };
}

function windowsSigningOptions({
  env = process.env,
  platform = process.platform,
} = {}) {
  if (platform !== "win32" || env.EMBER_ELECTRON_SIGN !== "1") {
    return {};
  }

  const certificateFile = env.EMBER_WINDOWS_SIGNING_CERTIFICATE_FILE?.trim();
  const certificatePassword = env.EMBER_WINDOWS_SIGNING_CERTIFICATE_PASSWORD;
  if (!certificateFile || !certificatePassword) {
    return {};
  }

  return {
    certificateFile,
    certificatePassword,
  };
}

function windowsSquirrelRemoteReleasesUrl({ env = process.env } = {}) {
  const remoteReleasesUrl =
    env.EMBER_WINDOWS_SQUIRREL_REMOTE_RELEASES_URL?.trim();
  if (!remoteReleasesUrl) {
    return undefined;
  }
  return remoteReleasesUrl.replace(/\/+$/, "");
}

function windowsSquirrelRemoteReleasesOptions(options = {}) {
  const remoteReleases = windowsSquirrelRemoteReleasesUrl(options);
  if (!remoteReleases) {
    return {};
  }
  return { remoteReleases };
}

function squirrelConfig(arch = process.arch, options = {}) {
  const packageVersion = options.packageVersion || PACKAGE_VERSION;
  return {
    authors: "Ember",
    exe: `${PRODUCT_NAME}.exe`,
    name: SQUIRREL_PACKAGE_NAME,
    noMsi: true,
    setupExe: `${PRODUCT_NAME}-${packageVersion} Setup.exe`,
    setupIcon: "ember-rs/icons/icon.ico",
    ...windowsSquirrelRemoteReleasesOptions(options),
    ...windowsSigningOptions(options),
  };
}

const MAC_DMG_WINDOW = { width: 520, height: 340 };
const MAC_DMG_ICON_SIZE = 104;
const MAC_DMG_ICON_Y = 160;

function macDmgContents({ appPath }) {
  return [
    {
      x: 392,
      y: MAC_DMG_ICON_Y,
      type: "link",
      path: "/Applications",
    },
    {
      x: 128,
      y: MAC_DMG_ICON_Y,
      type: "file",
      path: appPath,
    },
  ];
}

function macDmgConfig() {
  return {
    name: PRODUCT_DISPLAY_NAME,
    title: PRODUCT_DISPLAY_NAME,
    background: "resources/electron/dmg-background.png",
    icon: "ember-rs/icons/icon.icns",
    iconSize: MAC_DMG_ICON_SIZE,
    contents: macDmgContents,
    additionalDMGOptions: {
      "background-color": "#f7fbf4",
      window: {
        size: {
          width: MAC_DMG_WINDOW.width,
          height: MAC_DMG_WINDOW.height,
        },
      },
    },
  };
}

export {
  ignorePackagerInput,
  macDmgConfig,
  macDmgContents,
  macNotarizeOptions,
  macSignOptions,
  macZipConfig,
  normalizedUpdateBaseUrl,
  squirrelConfig,
  updateFeedLabel,
  updateFeedUrl,
  windowsSigningOptions,
  windowsSquirrelRemoteReleasesOptions,
  windowsSquirrelRemoteReleasesUrl,
};

export default {
  outDir: RELEASE_OUTPUT_DIR,
  packagerConfig: {
    name: PRODUCT_DISPLAY_NAME,
    executableName: PRODUCT_NAME,
    appBundleId: APP_ID,
    appCategoryType: "public.app-category.productivity",
    appCopyright: "Copyright © Ember",
    asar: true,
    prune: true,
    icon:
      process.platform === "win32"
        ? "ember-rs/icons/icon.ico"
        : "ember-rs/icons/icon.icns",
    extraResource: [
      "dist-electron/desktop-assets",
      "dist-electron/app-server.release.json",
      "dist-electron/app-server",
      "dist-electron/device-automation",
    ],
    protocols: [
      {
        name: "Ember URL",
        schemes: ["ember"],
      },
    ],
    extendInfo: {
      CFBundleDisplayName: PRODUCT_DISPLAY_NAME,
      CFBundleName: PRODUCT_DISPLAY_NAME,
      NSMicrophoneUsageDescription: `${PRODUCT_DISPLAY_NAME} 需要访问麦克风以使用语音输入功能`,
      NSAppleEventsUsageDescription: `${PRODUCT_DISPLAY_NAME} 需要控制其他应用以输入识别的文本`,
    },
    osxSign: macSignOptions(),
    osxNotarize: macNotarizeOptions(),
    win32metadata: {
      CompanyName: "Ember",
      FileDescription: PRODUCT_NAME,
      ProductName: PRODUCT_NAME,
      InternalName: PRODUCT_NAME,
    },
    afterCopyExtraResources: [
      (buildPath, _electronVersion, platform, _arch, done) => {
        if (platform !== "darwin") {
          done();
          return;
        }
        try {
          brandMacHelperApps({
            appOutDir: buildPath,
            productName: PRODUCT_NAME,
            bundleName: PRODUCT_DISPLAY_NAME,
          });
          done();
        } catch (error) {
          done(error);
        }
      },
    ],
    ignore: ignorePackagerInput,
  },
  rebuildConfig: {
    ignoreModules: ["canvas"],
  },
  makers: [
    new MakerDMG(macDmgConfig(), ["darwin"]),
    new MakerZIP((arch) => macZipConfig(arch), ["darwin"]),
    new MakerSquirrel((arch) => squirrelConfig(arch), ["win32"]),
  ],
};
