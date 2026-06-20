import { type LimeCapabilityArgs, type LimeCapabilityInvokeProvenance, type LimeCapabilityInvoker, type LimeCapabilityMethod, type LimeCapabilityName, type LimeCapabilityValue } from "./capabilityContract";
import type { LimeCapabilityError } from "./capabilityErrors";
export interface LimeCapabilityAdapterCallOptions {
    requestId?: string;
    idempotencyKey?: string;
    expectedSchema?: unknown;
    provenance?: LimeCapabilityInvokeProvenance;
}
export interface CreateEmberCoreCapabilityAdaptersOptions {
    invoker: LimeCapabilityInvoker;
    provenance?: LimeCapabilityInvokeProvenance;
    storageNamespace?: string;
}
export declare class LimeCapabilityAdapterError extends Error {
    readonly error: LimeCapabilityError;
    readonly code: LimeCapabilityError["code"];
    readonly causeCode?: string;
    readonly capability?: string;
    readonly method?: string;
    readonly requestId?: string;
    constructor(error: LimeCapabilityError);
}
type CapabilityAdapterMethod<Capability extends LimeCapabilityName, Method extends LimeCapabilityMethod<Capability>> = (args: LimeCapabilityArgs<Capability, Method>, options?: LimeCapabilityAdapterCallOptions) => Promise<LimeCapabilityValue<Capability, Method>>;
type OptionalArgsCapabilityAdapterMethod<Capability extends LimeCapabilityName, Method extends LimeCapabilityMethod<Capability>> = (args?: LimeCapabilityArgs<Capability, Method>, options?: LimeCapabilityAdapterCallOptions) => Promise<LimeCapabilityValue<Capability, Method>>;
type NoArgsCapabilityAdapterMethod<Capability extends LimeCapabilityName, Method extends LimeCapabilityMethod<Capability>> = (options?: LimeCapabilityAdapterCallOptions) => Promise<LimeCapabilityValue<Capability, Method>>;
type CapabilityAdapterMethodFor<Capability extends LimeCapabilityName, Method extends LimeCapabilityMethod<Capability>> = [LimeCapabilityArgs<Capability, Method>] extends [undefined] ? NoArgsCapabilityAdapterMethod<Capability, Method> : undefined extends LimeCapabilityArgs<Capability, Method> ? OptionalArgsCapabilityAdapterMethod<Capability, Method> : CapabilityAdapterMethod<Capability, Method>;
export type LimeCapabilityAdapter<Capability extends LimeCapabilityName> = {
    readonly [Method in LimeCapabilityMethod<Capability>]: CapabilityAdapterMethodFor<Capability, Method>;
};
type LimeCapabilityAdapterKey<Capability extends LimeCapabilityName> = Capability extends `ember.${infer Key}` ? Key : never;
type LimeCapabilityAdapterFor<Capability extends LimeCapabilityName> = Capability extends "ember.storage" ? LimeCapabilityAdapter<Capability> & {
    readonly namespace: string;
} : LimeCapabilityAdapter<Capability>;
export type EmberCoreCapabilityAdapters = {
    readonly [Capability in LimeCapabilityName as LimeCapabilityAdapterKey<Capability>]: LimeCapabilityAdapterFor<Capability>;
};
export type LimeUiCapabilityAdapter = LimeCapabilityAdapter<"ember.ui">;
export type LimeStorageCapabilityAdapter = LimeCapabilityAdapterFor<"ember.storage">;
export type LimeFilesCapabilityAdapter = LimeCapabilityAdapter<"ember.files">;
export type LimeAgentCapabilityAdapter = LimeCapabilityAdapter<"ember.agent">;
export type LimeKnowledgeCapabilityAdapter = LimeCapabilityAdapter<"ember.knowledge">;
export type LimeToolsCapabilityAdapter = LimeCapabilityAdapter<"ember.tools">;
export type LimeArtifactsCapabilityAdapter = LimeCapabilityAdapter<"ember.artifacts">;
export type LimeWorkflowCapabilityAdapter = LimeCapabilityAdapter<"ember.workflow">;
export type LimePolicyCapabilityAdapter = LimeCapabilityAdapter<"ember.policy">;
export type LimeSecretsCapabilityAdapter = LimeCapabilityAdapter<"ember.secrets">;
export type LimeEvidenceCapabilityAdapter = LimeCapabilityAdapter<"ember.evidence">;
export type LimeEventsCapabilityAdapter = LimeCapabilityAdapter<"ember.events">;
export type LimeCapabilitiesCapabilityAdapter = LimeCapabilityAdapter<"ember.capabilities">;
export type LimeModelsCapabilityAdapter = LimeCapabilityAdapter<"ember.models">;
export type LimeUsageCapabilityAdapter = LimeCapabilityAdapter<"ember.usage">;
export type LimeMemoryCapabilityAdapter = LimeCapabilityAdapter<"ember.memory">;
export type EmberSkillsCapabilityAdapter = LimeCapabilityAdapter<"ember.skills">;
export type LimeMcpCapabilityAdapter = LimeCapabilityAdapter<"ember.mcp">;
export type LimeBrowserCapabilityAdapter = LimeCapabilityAdapter<"ember.browser">;
export type LimeSearchCapabilityAdapter = LimeCapabilityAdapter<"ember.search">;
export type LimeDocumentsCapabilityAdapter = LimeCapabilityAdapter<"ember.documents">;
export type LimeMediaCapabilityAdapter = LimeCapabilityAdapter<"ember.media">;
export type LimeTerminalCapabilityAdapter = LimeCapabilityAdapter<"ember.terminal">;
export type LimeTasksCapabilityAdapter = LimeCapabilityAdapter<"ember.tasks">;
export type LimeSettingsCapabilityAdapter = LimeCapabilityAdapter<"ember.settings">;
export type LimeWorkspaceCapabilityAdapter = LimeCapabilityAdapter<"ember.workspace">;
export type LimeContextCapabilityAdapter = LimeCapabilityAdapter<"ember.context">;
export type LimeConnectorsCapabilityAdapter = LimeCapabilityAdapter<"ember.connectors">;
export type LimeAutomationCapabilityAdapter = LimeCapabilityAdapter<"ember.automation">;
export type LimeReviewCapabilityAdapter = LimeCapabilityAdapter<"ember.review">;
export declare function createEmberCoreCapabilityAdapters(options: CreateEmberCoreCapabilityAdaptersOptions): EmberCoreCapabilityAdapters;
export {};
