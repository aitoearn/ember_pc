import {
  buildLimeCapabilityInvokeRequest,
  type LimeCapabilityArgs,
  type LimeCapabilityInvokeProvenance,
  type LimeCapabilityInvoker,
  type LimeCapabilityMethod,
  type LimeCapabilityName,
  type LimeCapabilityValue,
} from "./capabilityContract";
import {
  EMBER_CAPABILITY_DEFINITIONS,
  getLimeCapabilityAdapterKey,
  type LimeCapabilityDefinitionRecord,
} from "./capabilityCatalog";
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

export class LimeCapabilityAdapterError extends Error {
  readonly error: LimeCapabilityError;
  readonly code: LimeCapabilityError["code"];
  readonly causeCode?: string;
  readonly capability?: string;
  readonly method?: string;
  readonly requestId?: string;

  constructor(error: LimeCapabilityError) {
    super(error.message);
    this.name = "LimeCapabilityAdapterError";
    this.error = error;
    this.code = error.code;
    this.causeCode = error.causeCode;
    this.capability = error.capability;
    this.method = error.method;
    this.requestId = error.requestId;
  }
}

type CapabilityAdapterMethod<
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
> = (
  args: LimeCapabilityArgs<Capability, Method>,
  options?: LimeCapabilityAdapterCallOptions,
) => Promise<LimeCapabilityValue<Capability, Method>>;

type OptionalArgsCapabilityAdapterMethod<
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
> = (
  args?: LimeCapabilityArgs<Capability, Method>,
  options?: LimeCapabilityAdapterCallOptions,
) => Promise<LimeCapabilityValue<Capability, Method>>;

type NoArgsCapabilityAdapterMethod<
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
> = (
  options?: LimeCapabilityAdapterCallOptions,
) => Promise<LimeCapabilityValue<Capability, Method>>;

type CapabilityAdapterMethodFor<
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
> = [LimeCapabilityArgs<Capability, Method>] extends [undefined]
  ? NoArgsCapabilityAdapterMethod<Capability, Method>
  : undefined extends LimeCapabilityArgs<Capability, Method>
    ? OptionalArgsCapabilityAdapterMethod<Capability, Method>
    : CapabilityAdapterMethod<Capability, Method>;

export type LimeCapabilityAdapter<Capability extends LimeCapabilityName> = {
  readonly [Method in LimeCapabilityMethod<Capability>]: CapabilityAdapterMethodFor<
    Capability,
    Method
  >;
};

type LimeCapabilityAdapterKey<Capability extends LimeCapabilityName> =
  Capability extends `ember.${infer Key}` ? Key : never;

type LimeCapabilityAdapterFor<Capability extends LimeCapabilityName> =
  Capability extends "ember.storage"
    ? LimeCapabilityAdapter<Capability> & { readonly namespace: string }
    : LimeCapabilityAdapter<Capability>;

export type EmberCoreCapabilityAdapters = {
  readonly [Capability in LimeCapabilityName as LimeCapabilityAdapterKey<Capability>]: LimeCapabilityAdapterFor<Capability>;
};

export type LimeUiCapabilityAdapter = LimeCapabilityAdapter<"ember.ui">;
export type LimeStorageCapabilityAdapter =
  LimeCapabilityAdapterFor<"ember.storage">;
export type LimeFilesCapabilityAdapter = LimeCapabilityAdapter<"ember.files">;
export type LimeAgentCapabilityAdapter = LimeCapabilityAdapter<"ember.agent">;
export type LimeKnowledgeCapabilityAdapter =
  LimeCapabilityAdapter<"ember.knowledge">;
export type LimeToolsCapabilityAdapter = LimeCapabilityAdapter<"ember.tools">;
export type LimeArtifactsCapabilityAdapter =
  LimeCapabilityAdapter<"ember.artifacts">;
export type LimeWorkflowCapabilityAdapter =
  LimeCapabilityAdapter<"ember.workflow">;
export type LimePolicyCapabilityAdapter = LimeCapabilityAdapter<"ember.policy">;
export type LimeSecretsCapabilityAdapter =
  LimeCapabilityAdapter<"ember.secrets">;
export type LimeEvidenceCapabilityAdapter =
  LimeCapabilityAdapter<"ember.evidence">;
export type LimeEventsCapabilityAdapter = LimeCapabilityAdapter<"ember.events">;
export type LimeCapabilitiesCapabilityAdapter =
  LimeCapabilityAdapter<"ember.capabilities">;
export type LimeModelsCapabilityAdapter = LimeCapabilityAdapter<"ember.models">;
export type LimeUsageCapabilityAdapter = LimeCapabilityAdapter<"ember.usage">;
export type LimeMemoryCapabilityAdapter = LimeCapabilityAdapter<"ember.memory">;
export type EmberSkillsCapabilityAdapter = LimeCapabilityAdapter<"ember.skills">;
export type LimeMcpCapabilityAdapter = LimeCapabilityAdapter<"ember.mcp">;
export type LimeBrowserCapabilityAdapter =
  LimeCapabilityAdapter<"ember.browser">;
export type LimeSearchCapabilityAdapter = LimeCapabilityAdapter<"ember.search">;
export type LimeDocumentsCapabilityAdapter =
  LimeCapabilityAdapter<"ember.documents">;
export type LimeMediaCapabilityAdapter = LimeCapabilityAdapter<"ember.media">;
export type LimeTerminalCapabilityAdapter =
  LimeCapabilityAdapter<"ember.terminal">;
export type LimeTasksCapabilityAdapter = LimeCapabilityAdapter<"ember.tasks">;
export type LimeSettingsCapabilityAdapter =
  LimeCapabilityAdapter<"ember.settings">;
export type LimeWorkspaceCapabilityAdapter =
  LimeCapabilityAdapter<"ember.workspace">;
export type LimeContextCapabilityAdapter =
  LimeCapabilityAdapter<"ember.context">;
export type LimeConnectorsCapabilityAdapter =
  LimeCapabilityAdapter<"ember.connectors">;
export type LimeAutomationCapabilityAdapter =
  LimeCapabilityAdapter<"ember.automation">;
export type LimeReviewCapabilityAdapter = LimeCapabilityAdapter<"ember.review">;

const NO_ARGS_CAPABILITY_METHOD_KEYS = new Set([
  "ember.ui.getSnapshot",
  "ember.storage.list",
  "ember.agent.listTasks",
  "ember.events.listSubscriptions",
  "ember.capabilities.list",
  "ember.capabilities.getProfile",
  "ember.mcp.listServers",
  "ember.workspace.getCurrent",
  "ember.workspace.list",
]);

async function callCapability<
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
>(
  invoker: LimeCapabilityInvoker,
  defaultProvenance: LimeCapabilityInvokeProvenance | undefined,
  capability: Capability,
  method: Method,
  args: LimeCapabilityArgs<Capability, Method> | undefined,
  options: LimeCapabilityAdapterCallOptions | undefined,
): Promise<LimeCapabilityValue<Capability, Method>> {
  const response = await invoker.call(
    buildLimeCapabilityInvokeRequest({
      capability,
      method,
      args: args as LimeCapabilityArgs<Capability, Method>,
      requestId: options?.requestId,
      idempotencyKey: options?.idempotencyKey,
      expectedSchema: options?.expectedSchema,
      provenance: options?.provenance ?? defaultProvenance,
    }),
  );
  if (response.ok) {
    return response.value;
  }
  throw new LimeCapabilityAdapterError(response.error);
}

type BoundCapabilityCall = <
  Capability extends LimeCapabilityName,
  Method extends LimeCapabilityMethod<Capability>,
>(
  capability: Capability,
  method: Method,
  args: LimeCapabilityArgs<Capability, Method> | undefined,
  callOptions?: LimeCapabilityAdapterCallOptions,
) => Promise<LimeCapabilityValue<Capability, Method>>;

function createCapabilityAdapter<Capability extends LimeCapabilityName>(
  definition: LimeCapabilityDefinitionRecord & { name: Capability },
  call: BoundCapabilityCall,
): LimeCapabilityAdapter<Capability> {
  const adapter: Record<string, unknown> = {};
  definition.methods.forEach((methodName) => {
    const method = methodName as LimeCapabilityMethod<Capability>;
    const methodKey = `${definition.name}.${methodName}`;
    adapter[methodName] = (argsOrOptions?: unknown, maybeOptions?: unknown) => {
      if (NO_ARGS_CAPABILITY_METHOD_KEYS.has(methodKey)) {
        return call(
          definition.name,
          method,
          undefined,
          argsOrOptions as LimeCapabilityAdapterCallOptions | undefined,
        );
      }
      return call(
        definition.name,
        method,
        argsOrOptions as LimeCapabilityArgs<Capability, typeof method>,
        maybeOptions as LimeCapabilityAdapterCallOptions | undefined,
      );
    };
  });
  return adapter as LimeCapabilityAdapter<Capability>;
}

export function createEmberCoreCapabilityAdapters(
  options: CreateEmberCoreCapabilityAdaptersOptions,
): EmberCoreCapabilityAdapters {
  const { invoker, provenance } = options;
  const call: BoundCapabilityCall = (capability, method, args, callOptions) =>
    callCapability(invoker, provenance, capability, method, args, callOptions);
  const adapters: Record<string, unknown> = {};

  EMBER_CAPABILITY_DEFINITIONS.forEach((definition) => {
    const adapter = createCapabilityAdapter(definition, call);
    adapters[getLimeCapabilityAdapterKey(definition.name)] =
      definition.name === "ember.storage"
        ? {
            namespace:
              options.storageNamespace ?? provenance?.appId ?? "agent_app",
            ...adapter,
          }
        : adapter;
  });

  return adapters as EmberCoreCapabilityAdapters;
}
