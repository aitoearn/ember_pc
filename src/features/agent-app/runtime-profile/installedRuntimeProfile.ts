import type {
  AgentAppInstallMode,
  HostCapabilityProfile,
  InstalledAgentAppState,
  InstalledAppPreview,
  EmberRuntimeProfile,
} from "../types";
import { buildEmberRuntimeProfileFromHostProfile } from "./resolveRuntimeProfile";

export function buildEmberRuntimeProfileForPreview(params: {
  preview: InstalledAppPreview;
  hostProfile: HostCapabilityProfile;
  installMode?: AgentAppInstallMode;
}): EmberRuntimeProfile {
  return buildEmberRuntimeProfileFromHostProfile({
    appId: params.preview.identity.appId,
    installMode: params.installMode ?? params.preview.projection.install.preferredMode,
    hostProfile: params.hostProfile,
    storageNamespace: params.preview.projection.storage?.namespace,
  });
}

export function buildEmberRuntimeProfileForInstalledState(params: {
  state: InstalledAgentAppState;
  hostProfile: HostCapabilityProfile;
}): EmberRuntimeProfile {
  return buildEmberRuntimeProfileFromHostProfile({
    appId: params.state.appId,
    installMode: params.state.installMode,
    hostProfile: params.hostProfile,
    storageNamespace: params.state.projection.storage?.namespace,
  });
}
