/** 供 React.lazy 与侧栏 prefetch 共用的 chunk 加载入口。 */
export function loadAgentObservabilityWorkspace() {
  return import("./index").then((module) => ({
    default: module.AgentObservabilityWorkspace,
  }));
}
