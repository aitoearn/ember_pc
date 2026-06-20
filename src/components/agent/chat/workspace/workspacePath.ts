function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizeManagedHomeProjectsPath(value: string): string | null {
  const match = value.match(/^(.+)\/\.(?:proxycast|ember)\/projects(\/.*)?$/);
  if (!match) {
    return null;
  }

  const homeRoot = match[1] || "";
  const suffix = match[2] || "";

  if (/^[A-Za-z]:\/Users\/[^/]+$/i.test(homeRoot)) {
    return `${homeRoot}/AppData/Roaming/ember/projects${suffix}`;
  }
  if (/^\/Users\/[^/]+$/.test(homeRoot)) {
    return `${homeRoot}/Library/Application Support/ember/projects${suffix}`;
  }
  if (/^(\/home\/[^/]+|\/root)$/.test(homeRoot)) {
    return `${homeRoot}/.local/share/ember/projects${suffix}`;
  }

  return null;
}

function normalizeManagedAppDataProjectsPath(value: string): string | null {
  const rules: Array<{ pattern: RegExp; replacement: string }> = [
    {
      pattern:
        /^(\/Users\/[^/]+)\/Library\/Application Support\/(?:proxycast|ember)\/projects(\/.*)?$/,
      replacement: "$1/Library/Application Support/ember/projects$2",
    },
    {
      pattern:
        /^([A-Za-z]:\/Users\/[^/]+)\/AppData\/Roaming\/(?:proxycast|ember)\/projects(\/.*)?$/i,
      replacement: "$1/AppData/Roaming/ember/projects$2",
    },
    {
      pattern:
        /^((?:\/home\/[^/]+|\/root))\/\.local\/share\/(?:proxycast|ember)\/projects(\/.*)?$/,
      replacement: "$1/.local/share/ember/projects$2",
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(value)) {
      return value.replace(rule.pattern, rule.replacement);
    }
  }

  return null;
}

export function normalizeManagedWorkspacePathForDisplay(
  value: string | null | undefined,
): string {
  const normalized = normalizeWorkspacePath(value?.trim() || "");
  if (!normalized) {
    return "";
  }

  return (
    normalizeManagedHomeProjectsPath(normalized) ||
    normalizeManagedAppDataProjectsPath(normalized) ||
    normalized
  );
}

export function isAbsoluteWorkspacePath(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("~/") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith("\\\\")
  );
}

function joinWorkspacePath(rootPath: string, filePath: string): string {
  return `${rootPath.replace(/[\\/]+$/, "")}/${filePath.replace(/^[\\/]+/, "")}`;
}

export function extractFileNameFromPath(
  path: string | null | undefined,
): string {
  const normalized = normalizeWorkspacePath(path?.trim() || "");
  if (!normalized) {
    return "未命名文件";
  }

  const segments = normalized.split("/");
  return segments[segments.length - 1] || normalized;
}

export function resolveAbsoluteWorkspacePath(
  workspaceRoot: string | null | undefined,
  filePath: string | null | undefined,
): string | undefined {
  const normalizedFilePath = filePath?.trim();
  if (!normalizedFilePath) {
    return undefined;
  }

  if (isAbsoluteWorkspacePath(normalizedFilePath)) {
    return normalizedFilePath;
  }

  const normalizedWorkspaceRoot = workspaceRoot?.trim();
  if (!normalizedWorkspaceRoot) {
    return normalizedFilePath;
  }

  return joinWorkspacePath(normalizedWorkspaceRoot, normalizedFilePath);
}
