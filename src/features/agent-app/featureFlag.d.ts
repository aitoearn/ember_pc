import type { AgentAppHostFlags } from "./types";
export declare const AGENT_APP_LAB_STORAGE_KEY = "ember.agentAppHost.labEnabled";
export declare const AGENT_APP_HOST_FLAGS_STORAGE_KEY = "ember.agentAppHost.flags";
export declare const defaultAgentAppHostFlags: AgentAppHostFlags;
export declare function resolveAgentAppHostFlags(overrides?: Partial<AgentAppHostFlags>): AgentAppHostFlags;
export declare function isAgentAppLabEnabled(): boolean;
