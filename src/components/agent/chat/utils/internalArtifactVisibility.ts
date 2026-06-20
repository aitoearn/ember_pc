import { normalizeArtifactProtocolPath } from "@/lib/artifact-protocol";

function normalizeArtifactPath(path?: string | null): string {
  return path ? normalizeArtifactProtocolPath(path) : "";
}

export function isHiddenInternalArtifactPath(path?: string | null): boolean {
  const normalizedPath = normalizeArtifactPath(path);
  if (!normalizedPath || !normalizedPath.endsWith(".json")) {
    return false;
  }

  return (
    normalizedPath.startsWith(".ember/tasks/") ||
    normalizedPath.includes("/.ember/tasks/")
  );
}

export function isHiddenConversationArtifactPath(
  path?: string | null,
): boolean {
  const normalizedPath = normalizeArtifactPath(path);
  if (!normalizedPath) {
    return false;
  }

  if (isHiddenInternalArtifactPath(normalizedPath)) {
    return true;
  }

  const isAuxiliaryRuntimeProjection =
    normalizedPath.endsWith(".json") &&
    normalizedPath.includes("/auxiliary-runtime/") &&
    (normalizedPath.startsWith(".ember/harness/sessions/") ||
      normalizedPath.includes("/.ember/harness/sessions/"));

  if (isAuxiliaryRuntimeProjection) {
    return true;
  }

  const isInternalArtifactDocument =
    normalizedPath.endsWith(".artifact.json") &&
    (normalizedPath.startsWith(".ember/artifacts/") ||
      normalizedPath.includes("/.ember/artifacts/"));

  return isInternalArtifactDocument;
}
