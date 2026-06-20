import fs from "node:fs";
import path from "node:path";

export const DEFAULT_UPDATE_BASE_URL = "https://updates.aiearn.me";

export const TARGET_TO_FEED = {
  "aarch64-apple-darwin": "darwin-arm64",
  "x86_64-apple-darwin": "darwin-x64",
  "x86_64-pc-windows-msvc": "win32-x64",
};

export function parseCliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const result = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(filePath);
      } else if (entry.isFile()) {
        result.push(filePath);
      }
    }
  }
  return result.sort();
}

export function normalizeVersionTag(value) {
  const version = String(value || "").trim();
  if (!version) {
    throw new Error("version is required");
  }
  return `v${version.replace(/^v/, "")}`;
}

export function contentTypeFor(filePath) {
  const basename = path.basename(filePath);
  if (basename === "RELEASES.json") {
    return "application/json";
  }
  if (basename === "RELEASES") {
    return "text/plain";
  }
  return "application/octet-stream";
}

export function cacheControlFor(filePath) {
  if (/^RELEASES(?:\.json)?$/i.test(path.basename(filePath))) {
    return "public, max-age=60, stale-while-revalidate=300";
  }
  return "public, max-age=31536000, immutable";
}

export function isElectronUpdaterAsset(filePath) {
  const basename = path.basename(filePath);
  if (/^RELEASES(?:\.json)?$/i.test(basename)) {
    return true;
  }
  return /\.(dmg|exe|nupkg|zip)$/i.test(basename);
}

export function assertNoRetiredUpdaterAssets(files) {
  const legacy = files.filter((file) =>
    /(?:\.app\.tar\.gz|\.sig|latest(?:-mac)?\.yml|\.blockmap|latest\.json)$/i.test(
      path.basename(file),
    ),
  );
  if (legacy.length > 0) {
    throw new Error(
      `legacy updater assets are not allowed in Electron release: ${legacy.join(", ")}`,
    );
  }
}

export function buildElectronUpdateFeedUploadPlan({
  assetsDir = "release-assets",
  bucket = "lmtest-updates",
  channel = "stable",
  version,
} = {}) {
  const root = path.resolve(assetsDir);
  const versionTag = normalizeVersionTag(version);
  const files = walkFiles(root);
  assertNoRetiredUpdaterAssets(files);

  const items = [];
  for (const file of files) {
    const targetTriple = path.relative(root, file).split(path.sep)[0] || "";
    const feed = TARGET_TO_FEED[targetTriple];
    if (!feed || !isElectronUpdaterAsset(file)) {
      continue;
    }
    const key = `ember/${channel}/${feed}/${path.basename(file)}`;
    const versionedKey = `ember/${channel}/${versionTag}/${feed}/${path.basename(file)}`;
    for (const itemKey of [key, versionedKey]) {
      items.push({
        bucket,
        cacheControl: cacheControlFor(file),
        contentType: contentTypeFor(file),
        file,
        key: itemKey,
        remotePath: itemKey,
      });
    }
  }

  if (items.length === 0) {
    throw new Error(`no Electron updater assets found under ${root}`);
  }
  return items.sort((left, right) => left.key.localeCompare(right.key));
}

export function updateFeedUrlForPlatform(
  baseUrl = DEFAULT_UPDATE_BASE_URL,
  platform,
  arch,
) {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  let feed = `${platform}-${arch}`;
  if (platform === "darwin") {
    feed = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  } else if (platform === "win32") {
    feed = arch === "arm64" ? "win32-arm64" : "win32-x64";
  }
  const feedUrl = `${normalizedBase}/ember/stable/${feed}`;
  if (platform === "darwin") {
    return `${feedUrl}/RELEASES.json`;
  }
  return feedUrl;
}
