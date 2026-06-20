import type { AgentAppProjection, EmberRuntimeProfile } from "../types";
import type { ShellDescriptor } from "./ShellLaunchPort";
import { buildShellDescriptor } from "./buildStandaloneShellDescriptor";

export function buildRuntimeBackedDescriptor(params: {
  projection: AgentAppProjection;
  runtimeProfile: EmberRuntimeProfile;
}): ShellDescriptor {
  return buildShellDescriptor({ ...params, installMode: "runtime_backed" });
}
