import { buildAdapterCapabilityProfile } from "../adapters/adapterCapabilityProfile";
import { resolveAgentAppHostFlags } from "../featureFlag";
import { p0HostCapabilityProfile } from "../readiness/hostCapabilityProfile";
import type { AgentAppHostFlags, HostCapabilityProfile } from "../types";

export function buildWorkflowRuntimeCapabilityProfile(
  flagOverrides: Partial<AgentAppHostFlags> = {},
): HostCapabilityProfile {
  const featureFlags = resolveAgentAppHostFlags({
    ...flagOverrides,
    labEnabled: true,
    workerRuntimeEnabled: true,
  });
  const baseProfile = featureFlags.realAdapterEnabled
    ? buildAdapterCapabilityProfile(featureFlags)
    : p0HostCapabilityProfile;

  return {
    ...baseProfile,
    capabilities: {
      ...baseProfile.capabilities,
      "ember.workflow": {
        version: baseProfile.capabilities["ember.workflow"]?.version ?? "0.3.0",
        enabled: true,
        implementation: "native",
      },
      "ember.ui": {
        version: baseProfile.capabilities["ember.ui"]?.version ?? "0.3.0",
        enabled: featureFlags.uiRuntimeEnabled || baseProfile.capabilities["ember.ui"]?.enabled === true,
        implementation: featureFlags.uiRuntimeEnabled
          ? "native"
          : baseProfile.capabilities["ember.ui"]?.implementation ?? "none",
      },
    },
    featureFlags: {
      ...baseProfile.featureFlags,
      ...featureFlags,
      labEnabled: true,
      workerRuntimeEnabled: true,
    },
  };
}
