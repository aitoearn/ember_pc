/** 侧栏 Agent 观测入口；默认关闭，待 Phoenix/OTLP 链路就绪后再开启。 */
export const AGENT_OBSERVABILITY_ENABLED_STORAGE_KEY =
  "lime.agent-observability.enabled";

function readBooleanFlag(value: string | undefined | null): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function readLocalStorageFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return readBooleanFlag(
      window.localStorage.getItem(AGENT_OBSERVABILITY_ENABLED_STORAGE_KEY),
    );
  } catch {
    return false;
  }
}

export function isAgentObservabilityEnabled(): boolean {
  const fromEnv = import.meta.env.VITE_LIME_AGENT_OBSERVABILITY;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    return readBooleanFlag(String(fromEnv));
  }
  return readLocalStorageFlag();
}
