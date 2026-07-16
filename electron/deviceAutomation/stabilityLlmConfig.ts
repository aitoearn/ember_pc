import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { StabilityLlmConfig } from "../../src/features/device-automation/stability/types";
import { isPlaceholderLlmSecret } from "./captureDeviceLogcat";

type AgentConfigFile = {
  llm_config?: {
    active_provider?: string;
    provider_defaults?: Record<string, unknown>;
    providers?: Record<string, Record<string, unknown>>;
  };
};

const SUPPORTED_PROVIDERS = new Set<StabilityLlmConfig["provider"]>([
  "openai",
  "deepseek",
  "zhipu_bigmodel",
]);

let configRoot: string | null = null;

export function setStabilityLlmConfigRoot(root: string | null): void {
  configRoot = root?.trim() || null;
}

export function resetStabilityLlmConfigForTests(): void {
  configRoot = null;
}

export function getStabilityLlmConfigPath(): string {
  if (!configRoot) {
    throw new Error("稳定性 LLM 配置根目录未初始化");
  }
  return path.join(configRoot, "agent_config.local.json");
}

function ensureConfigRoot(): string {
  if (!configRoot) {
    throw new Error("稳定性 LLM 配置根目录未初始化");
  }
  mkdirSync(configRoot, { recursive: true });
  return configRoot;
}

function readAgentConfigFile(): AgentConfigFile {
  const configPath = getStabilityLlmConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as AgentConfigFile)
      : {};
  } catch (error) {
    console.warn(
      "[device-automation] 读取稳定性 LLM 配置失败，将使用空配置：",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed || isPlaceholderLlmSecret(trimmed)) {
    return "";
  }
  if (trimmed.length <= 4) {
    return "*".repeat(trimmed.length);
  }
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function normalizeProvider(value: unknown): StabilityLlmConfig["provider"] {
  if (
    value === "openai" ||
    value === "deepseek" ||
    value === "zhipu_bigmodel"
  ) {
    return value;
  }
  return "openai";
}

function mergeProviderConfig(file: AgentConfigFile): {
  provider: StabilityLlmConfig["provider"];
  baseUrl: string;
  model: string;
  apiKey: string;
} {
  const llmCfg = file.llm_config ?? {};
  const provider = normalizeProvider(llmCfg.active_provider);
  const defaults =
    typeof llmCfg.provider_defaults === "object" && llmCfg.provider_defaults
      ? llmCfg.provider_defaults
      : {};
  const providers =
    typeof llmCfg.providers === "object" && llmCfg.providers
      ? llmCfg.providers
      : {};
  const providerCfg = {
    ...defaults,
    ...(providers[provider] ?? {}),
  };

  const apiKey =
    typeof providerCfg.api_key === "string" ? providerCfg.api_key.trim() : "";
  const baseUrl =
    typeof providerCfg.base_url === "string" ? providerCfg.base_url.trim() : "";
  const model =
    typeof providerCfg.model === "string" ? providerCfg.model.trim() : "";

  return { provider, baseUrl, model, apiKey };
}

export function readStabilityLlmConfig(): StabilityLlmConfig {
  ensureConfigRoot();
  const merged = mergeProviderConfig(readAgentConfigFile());
  const configured =
    Boolean(merged.baseUrl && merged.model) &&
    !isPlaceholderLlmSecret(merged.apiKey);

  return {
    provider: merged.provider,
    baseUrl: merged.baseUrl,
    model: merged.model,
    apiKey: maskApiKey(merged.apiKey),
    configured,
  };
}

function buildAgentConfigPayload(config: StabilityLlmConfig): AgentConfigFile {
  const provider = SUPPORTED_PROVIDERS.has(config.provider)
    ? config.provider
    : "openai";
  const apiKey = config.apiKey.trim();
  const existing = readAgentConfigFile();
  const llmCfg = existing.llm_config ?? {};
  const providers =
    typeof llmCfg.providers === "object" && llmCfg.providers
      ? { ...llmCfg.providers }
      : {};
  const defaults =
    typeof llmCfg.provider_defaults === "object" && llmCfg.provider_defaults
      ? { ...llmCfg.provider_defaults }
      : {
          request_format: "openai_chat_completions_compatible",
          auth_type: "api_key",
          auth_header: "Authorization",
          auth_prefix: "Bearer ",
          adapter_provider: "openai",
          request_timeout: 180,
          stream: true,
        };

  const previousProviderCfg =
    typeof providers[provider] === "object" && providers[provider]
      ? providers[provider]
      : {};

  const nextProviderCfg: Record<string, unknown> = {
    ...previousProviderCfg,
    base_url: config.baseUrl.trim(),
    model: config.model.trim(),
  };

  if (apiKey && !apiKey.includes("*")) {
    nextProviderCfg.api_key = apiKey;
  }

  if (provider === "deepseek") {
    nextProviderCfg.adapter_provider = "deepseek";
  } else if (provider === "zhipu_bigmodel") {
    nextProviderCfg.adapter_provider = "openai";
  }

  providers[provider] = nextProviderCfg;

  return {
    ...existing,
    llm_config: {
      ...llmCfg,
      active_provider: provider,
      provider_defaults: defaults,
      providers,
    },
  };
}

/** 校验 LLM 配置是否可用于 scope=full 分析（等价 sa-agent _build_llm_config_from_agent_config 非空）。 */
export function validateStabilityLlmConfigForFullAnalysis(
  file?: AgentConfigFile,
): boolean {
  if (!configRoot) {
    return false;
  }
  const resolvedFile = file ?? readAgentConfigFile();
  const merged = mergeProviderConfig(resolvedFile);
  return (
    Boolean(merged.baseUrl && merged.model) &&
    !isPlaceholderLlmSecret(merged.apiKey)
  );
}

export function saveStabilityLlmConfig(config: StabilityLlmConfig): { ok: true } {
  ensureConfigRoot();
  const baseUrl = config.baseUrl?.trim();
  const model = config.model?.trim();
  if (!baseUrl || !model) {
    throw new Error("LLM baseUrl 与 model 不能为空");
  }

  const payload = buildAgentConfigPayload(config);
  const configPath = getStabilityLlmConfigPath();
  writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  if (!validateStabilityLlmConfigForFullAnalysis(payload)) {
    console.warn(
      "[device-automation] 稳定性 LLM 配置已保存，但 API Key 仍不可用，full 分析将被拒绝",
    );
  } else {
    console.log("[device-automation] 稳定性 LLM 配置已保存");
  }

  return { ok: true };
}

export function resolveStabilityAgentConfigDir(): string {
  return ensureConfigRoot();
}
