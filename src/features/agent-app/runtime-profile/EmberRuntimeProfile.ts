import type {
  AgentAppInstallMode,
  EmberRuntimeProfile,
  EmberRuntimeShellKind,
} from "../types";

export function shellKindForInstallMode(
  installMode: AgentAppInstallMode,
): EmberRuntimeShellKind {
  if (installMode === "standalone") {
    return "app_shell";
  }
  if (installMode === "runtime_backed") {
    return "runtime_backed";
  }
  if (installMode === "web_host") {
    return "web_host";
  }
  return "desktop";
}

export function summarizeRuntimeProfile(profile: EmberRuntimeProfile): {
  runtimeId: string;
  runtimeVersion: string;
  shellKind: EmberRuntimeShellKind;
  installMode: AgentAppInstallMode;
  availableCapabilityCount: number;
  unavailableCapabilityCount: number;
} {
  const capabilities = Object.values(profile.capabilities);
  return {
    runtimeId: profile.runtimeId,
    runtimeVersion: profile.runtimeVersion,
    shellKind: profile.shellKind,
    installMode: profile.installMode,
    availableCapabilityCount: capabilities.filter((capability) => capability.available).length,
    unavailableCapabilityCount: capabilities.filter((capability) => !capability.available).length,
  };
}
