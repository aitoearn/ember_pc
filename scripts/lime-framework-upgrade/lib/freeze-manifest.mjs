import fs from "node:fs";
import path from "node:path";

const DEFAULT_MANIFEST_PATH = path.join(
  process.cwd(),
  "scripts/lime-framework-upgrade/freeze-manifest.json",
);

/**
 * 将 lime-rs 路径映射为 ember-rs，用于检查来自 Lime 仓库的 diff 路径。
 */
export function mapLimePathToEmber(filePath) {
  const normalized = normalizeRepoPath(filePath);
  if (normalized === "lime-rs" || normalized.startsWith("lime-rs/")) {
    return normalized.replace(/^lime-rs/, "ember-rs");
  }
  return normalized;
}

export function normalizeRepoPath(filePath) {
  return String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");
}

export function loadFreezeManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`冻结清单不存在: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return { manifest, manifestPath };
}

function globPatternToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function buildProtectedPathRules(manifest) {
  const directoryPrefixes = [...(manifest.freezeDirectories ?? [])]
    .map(normalizeRepoPath)
    .sort((a, b) => b.length - a.length);

  const exactFiles = new Set(
    [
      ...(manifest.freezeFiles ?? []),
      ...(manifest.emberOnlyRustModules ?? []),
      ...(manifest.emberOnlyApiGateway ?? []),
      ...(manifest.emberOnlyAgentRuntimeApi ?? []),
    ].map(normalizeRepoPath),
  );

  const globPatterns = [
    ...(manifest.freezeGlobPatterns ?? []),
    ...(manifest.emberOnlyRustSchemas ?? []),
  ].map((pattern) => globPatternToRegExp(normalizeRepoPath(pattern)));

  return { directoryPrefixes, exactFiles, globPatterns };
}

function matchProtectedPath(filePath, rules) {
  const normalized = normalizeRepoPath(filePath);
  if (rules.exactFiles.has(normalized)) {
    return { matched: true, reason: "exact" };
  }
  for (const pattern of rules.globPatterns) {
    if (pattern.test(normalized)) {
      return { matched: true, reason: "glob" };
    }
  }
  for (const prefix of rules.directoryPrefixes) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return { matched: true, reason: "directory" };
    }
  }
  return { matched: false, reason: null };
}

/**
 * @returns {{ violations: Array<{ path: string, sourcePath?: string, reason: string }>, protectedCount: number }}
 */
export function findFreezeViolations(filePaths, options = {}) {
  const { manifest } = loadFreezeManifest(options.manifestPath);
  const rules = buildProtectedPathRules(manifest);
  const mapLime = options.mapLimeRs !== false;
  const uniquePaths = [...new Set(filePaths.map(normalizeRepoPath).filter(Boolean))];

  const violations = [];
  for (const sourcePath of uniquePaths) {
    const emberPath = mapLime ? mapLimePathToEmber(sourcePath) : sourcePath;
    const { matched, reason } = matchProtectedPath(emberPath, rules);
    if (matched) {
      violations.push({
        path: emberPath,
        sourcePath: emberPath === sourcePath ? undefined : sourcePath,
        reason,
      });
    }
  }

  return {
    violations,
    protectedCount: uniquePaths.length - violations.length,
  };
}

export function parsePatchFilePaths(patchContent) {
  const paths = new Set();
  const lines = patchContent.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^(?:---|\+\+\+)\s+[ab]\/(.+)$/);
    if (match?.[1] && match[1] !== "/dev/null") {
      paths.add(normalizeRepoPath(match[1]));
    }
    const diffGitMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (diffGitMatch) {
      if (diffGitMatch[1] !== "/dev/null") {
        paths.add(normalizeRepoPath(diffGitMatch[1]));
      }
      if (diffGitMatch[2] !== "/dev/null") {
        paths.add(normalizeRepoPath(diffGitMatch[2]));
      }
    }
  }
  return [...paths];
}

export function checkPackageJsonScriptsProtection(
  packageJsonPath = path.join(process.cwd(), "package.json"),
  options = {},
) {
  const { manifest } = loadFreezeManifest(options.manifestPath);
  const required = manifest.packageJsonScriptsToProtect ?? [];
  if (required.length === 0) {
    return { missing: [], ok: true };
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const scripts = packageJson.scripts ?? {};
  const missing = required.filter((name) => typeof scripts[name] !== "string");
  return { missing, ok: missing.length === 0 };
}
