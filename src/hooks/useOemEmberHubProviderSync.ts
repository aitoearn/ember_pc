import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  apiKeyProviderApi,
  type UpdateProviderRequest,
} from "@/lib/api/apiKeyProvider";
import {
  createClientAccessToken,
  type OemCloudBootstrapResponse,
  listClientProviderOfferModels,
} from "@/lib/api/oemCloudControlPlane";
import { resolveOemCloudRuntimeContext } from "@/lib/api/oemCloudRuntime";
import {
  getOemCloudBootstrapSnapshot,
  subscribeOemCloudBootstrapChanged,
  subscribeOemCloudSessionChanged,
} from "@/lib/oemCloudSession";
import {
  buildOemEmberHubApiHost,
  OEM_EMBER_HUB_PROVIDER_ID,
  resolveOemEmberHubProviderName,
} from "@/lib/oemEmberHubProvider";
import {
  hasDesktopHostInvokeCapability,
  hasDesktopHostRuntimeMarkers,
} from "@/lib/desktop-runtime";

const LEGACY_MANAGED_EMBER_HUB_KEY_ALIAS = "Ember Cloud模型";
const MANAGED_EMBER_HUB_KEY_MODELS_STATE =
  "oem_ember_hub_provider_sync:managed_key_models";

interface ManagedEmberHubProviderSyncCopy {
  managedKeyAlias: string;
  cloudTokenName: string;
}

function buildSyncSignature(
  runtime: ReturnType<typeof resolveOemCloudRuntimeContext>,
  customModels: string[],
  localApiKeyReady: boolean,
): string {
  return JSON.stringify({
    gatewayBaseUrl: runtime?.gatewayBaseUrl ?? null,
    hubProviderName: runtime?.hubProviderName ?? null,
    tenantId: runtime?.tenantId ?? null,
    sessionToken: runtime?.sessionToken ?? null,
    customModels,
    localApiKeyReady,
  });
}

function normalizeCustomModels(
  modelIds: string[],
  defaultModel?: string,
): string[] {
  const normalized = [defaultModel ?? "", ...modelIds]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return normalized.filter(
    (value, index) => normalized.indexOf(value) === index,
  );
}

async function resolveSyncedCustomModels(
  runtime: NonNullable<ReturnType<typeof resolveOemCloudRuntimeContext>>,
): Promise<string[]> {
  if (!runtime.sessionToken) {
    return [];
  }

  const snapshot = getOemCloudBootstrapSnapshot<OemCloudBootstrapResponse>();
  const preference = snapshot?.providerPreference;
  const offers = Array.isArray(snapshot?.providerOffersSummary)
    ? snapshot.providerOffersSummary.filter(
        (offer) => offer.source === "oem_cloud" && offer.providerKey,
      )
    : [];
  const cloudPreference =
    preference?.providerSource === "oem_cloud" && preference.providerKey
      ? preference
      : null;
  if (!cloudPreference && offers.length === 0) {
    return [];
  }

  const offerKeys = Array.from(
    new Set(
      [
        cloudPreference?.providerKey,
        ...offers.map((offer) => offer.providerKey),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const modelGroups = await Promise.all(
    offerKeys.map(async (providerKey) => {
      const matchedOffer = offers.find(
        (offer) => offer.providerKey === providerKey,
      );
      const models = await listClientProviderOfferModels(
        runtime.tenantId,
        providerKey,
      );
      return {
        defaultModel:
          providerKey === cloudPreference?.providerKey
            ? cloudPreference.defaultModel || matchedOffer?.defaultModel
            : matchedOffer?.defaultModel,
        modelIds: models.map((model) => model.modelId),
      };
    }),
  );

  return normalizeCustomModels(
    modelGroups.flatMap((group) => [
      group.defaultModel ?? "",
      ...group.modelIds,
    ]),
    cloudPreference?.defaultModel,
  );
}

function buildManagedKeyModelsState(input: {
  tenantId: string;
  customModels: string[];
}): string {
  return JSON.stringify({
    tenantId: input.tenantId,
    models: input.customModels,
  });
}

function hasUsableLocalApiKey(provider: {
  api_key_count?: number;
  api_keys?: Array<{ enabled?: boolean }>;
}): boolean {
  if (Array.isArray(provider.api_keys)) {
    return provider.api_keys.some((apiKey) => apiKey.enabled !== false);
  }
  return (
    typeof provider.api_key_count === "number" && provider.api_key_count > 0
  );
}

function isManagedEmberHubKey(
  key: {
    alias?: string | null;
    enabled?: boolean;
  },
  managedKeyAlias: string,
): boolean {
  const normalizedAlias = (key.alias ?? "").trim();
  return (
    key.enabled !== false &&
    (normalizedAlias === managedKeyAlias ||
      normalizedAlias === LEGACY_MANAGED_EMBER_HUB_KEY_ALIAS)
  );
}

function canSyncEmberHubProvider(): boolean {
  if (!hasDesktopHostInvokeCapability()) {
    return false;
  }
  if (hasDesktopHostRuntimeMarkers()) {
    return true;
  }
  return true;
}

async function ensureLocalEmberHubApiKey(input: {
  runtime: NonNullable<ReturnType<typeof resolveOemCloudRuntimeContext>>;
  customModels: string[];
  localApiKeyReady: boolean;
  apiKeys: Array<{ id?: string; alias?: string | null; enabled?: boolean }>;
  copy: ManagedEmberHubProviderSyncCopy;
}): Promise<boolean> {
  const { runtime, customModels, localApiKeyReady, apiKeys, copy } = input;
  if (!runtime.sessionToken || customModels.length === 0) {
    return localApiKeyReady;
  }

  if (localApiKeyReady) {
    const expectedState = buildManagedKeyModelsState({
      tenantId: runtime.tenantId,
      customModels,
    });
    try {
      const currentState = await apiKeyProviderApi.getUiState(
        MANAGED_EMBER_HUB_KEY_MODELS_STATE,
      );
      if (currentState === expectedState) {
        return true;
      }
    } catch {
      // UI state 只用于判断本地托管 key 是否覆盖最新模型；读取失败时重新签发更安全。
    }
  }

  const response = await createClientAccessToken(runtime.tenantId, {
    name: copy.cloudTokenName,
    scopes: ["llm:invoke"],
    allowedModels: customModels,
  });
  const apiKey = response.apiKey || response.rawToken;
  if (!apiKey) {
    return false;
  }

  const addedKey = await apiKeyProviderApi.addApiKey({
    provider_id: OEM_EMBER_HUB_PROVIDER_ID,
    api_key: apiKey,
    alias: copy.managedKeyAlias,
  });

  await Promise.all(
    apiKeys
      .filter((key) => isManagedEmberHubKey(key, copy.managedKeyAlias))
      .filter((key) => key.id && key.id !== addedKey.id)
      .map((key) =>
        apiKeyProviderApi.toggleApiKey(key.id as string, false).catch(() => {
          // 新 key 已写入；旧托管 key 禁用失败不阻塞本次同步，下次同步会继续尝试。
        }),
      ),
  );

  try {
    await apiKeyProviderApi.setUiState(
      MANAGED_EMBER_HUB_KEY_MODELS_STATE,
      buildManagedKeyModelsState({
        tenantId: runtime.tenantId,
        customModels,
      }),
    );
  } catch {
    // 状态写入失败不影响新 key 生效；后续同步会再补写。
  }
  return true;
}

export function useOemEmberHubProviderSync() {
  const { t } = useTranslation("common");
  const copy = useMemo<ManagedEmberHubProviderSyncCopy>(
    () => ({
      managedKeyAlias: t("common.oemEmberHubProviderSync.managedKeyAlias"),
      cloudTokenName: t("common.oemEmberHubProviderSync.cloudTokenName"),
    }),
    [t],
  );
  const syncEnabled = canSyncEmberHubProvider();
  const lastAppliedSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!syncEnabled) {
      return;
    }

    let disposed = false;

    async function syncProviders() {
      try {
        const runtime = resolveOemCloudRuntimeContext();
        if (!runtime) {
          lastAppliedSignatureRef.current = buildSyncSignature(null, [], false);
          return;
        }

        const providers = await apiKeyProviderApi.getProviders({
          forceRefresh: true,
        });
        if (disposed) {
          return;
        }

        const emberHubProvider = providers.find(
          (provider) => provider.id === OEM_EMBER_HUB_PROVIDER_ID,
        );
        if (!emberHubProvider) {
          lastAppliedSignatureRef.current = buildSyncSignature(
            runtime,
            [],
            false,
          );
          return;
        }

        const nextProviderName = resolveOemEmberHubProviderName(runtime);
        const nextApiHost = buildOemEmberHubApiHost(runtime);
        const currentCustomModels = Array.isArray(emberHubProvider.custom_models)
          ? emberHubProvider.custom_models
          : [];
        let nextCustomModels: string[] = [];
        try {
          nextCustomModels = await resolveSyncedCustomModels(runtime);
        } catch (error) {
          nextCustomModels = currentCustomModels;
          console.warn(
            "[Ember Cloud] 同步模型目录失败，保留现有模型配置:",
            error,
          );
        }
        if (disposed) {
          return;
        }
        const localApiKeyReady = hasUsableLocalApiKey(emberHubProvider);

        const signature = buildSyncSignature(
          runtime,
          nextCustomModels,
          localApiKeyReady,
        );
        if (lastAppliedSignatureRef.current === signature) {
          return;
        }

        const updateRequest: UpdateProviderRequest = {};

        if (emberHubProvider.name !== nextProviderName) {
          updateRequest.name = nextProviderName;
        }
        if (nextApiHost && emberHubProvider.api_host !== nextApiHost) {
          updateRequest.api_host = nextApiHost;
        }
        if (emberHubProvider.type !== "openai") {
          updateRequest.type = "openai";
        }
        if (!emberHubProvider.enabled) {
          updateRequest.enabled = true;
        }
        if (emberHubProvider.sort_order !== 0) {
          updateRequest.sort_order = 0;
        }
        const customModelsChanged =
          currentCustomModels.length !== nextCustomModels.length ||
          currentCustomModels.some(
            (modelId, index) => modelId !== nextCustomModels[index],
          );
        if (customModelsChanged) {
          updateRequest.custom_models = nextCustomModels;
        }

        if (Object.keys(updateRequest).length > 0) {
          await apiKeyProviderApi.updateProvider(
            OEM_EMBER_HUB_PROVIDER_ID,
            updateRequest,
          );
        }

        const nextLocalApiKeyReady = await ensureLocalEmberHubApiKey({
          runtime,
          customModels: nextCustomModels,
          localApiKeyReady,
          apiKeys: emberHubProvider.api_keys ?? [],
          copy,
        });

        lastAppliedSignatureRef.current = buildSyncSignature(
          runtime,
          nextCustomModels,
          nextLocalApiKeyReady,
        );
      } catch (error) {
        console.warn("[Ember Cloud] 同步 Provider 失败:", error);
      }
    }

    void syncProviders();

    const unsubscribeSession = subscribeOemCloudSessionChanged(() => {
      void syncProviders();
    });
    const unsubscribeBootstrap = subscribeOemCloudBootstrapChanged(() => {
      void syncProviders();
    });

    return () => {
      disposed = true;
      unsubscribeSession();
      unsubscribeBootstrap();
    };
  }, [copy, syncEnabled]);
}
