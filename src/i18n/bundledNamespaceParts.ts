export const CORE_NAMESPACES = [
  "common",
  "navigation",
  "settings",
  "workspace",
  "deviceAutomation",
  "agentObservability",
  "testCaseManagement",
  "agent",
  "errors",
] as const;

export type EmberNamespace = (typeof CORE_NAMESPACES)[number];

export const BUNDLED_NAMESPACE_RESOURCE_PARTS = {
  agent: [
    "agent",
    "agentHome",
    "agentInputbar",
    "agentMessageList",
    "agentRuntime",
    "agentSkills",
    "agentExperts",
    "agentTeamWorkspace",
  ],
} as const satisfies Partial<Record<EmberNamespace, readonly string[]>>;

function hasResourceParts(
  namespace: EmberNamespace,
): namespace is keyof typeof BUNDLED_NAMESPACE_RESOURCE_PARTS {
  return namespace in BUNDLED_NAMESPACE_RESOURCE_PARTS;
}

export function getBundledNamespaceResourceParts(
  namespace: EmberNamespace,
): readonly string[] {
  return hasResourceParts(namespace)
    ? BUNDLED_NAMESPACE_RESOURCE_PARTS[namespace]
    : [namespace];
}
