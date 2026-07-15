/**
 * 稳定性分析 LLM 配置 API（Electron Host 命令）。
 */

import type { StabilityLlmConfig } from "@/features/device-automation/stability/types";
import { safeInvoke } from "@/lib/dev-bridge/safeInvoke";

export type StabilityLlmConfigSaveInput = {
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: StabilityLlmConfig["provider"];
};

export type StabilityLlmConfigSaveResult = {
  ok: true;
};

export async function readStabilityLlmConfig(): Promise<StabilityLlmConfig> {
  return await safeInvoke<StabilityLlmConfig>(
    "device_automation_stability_llm_config_read",
    {},
  );
}

export async function saveStabilityLlmConfig(
  config: StabilityLlmConfigSaveInput,
): Promise<StabilityLlmConfigSaveResult> {
  return await safeInvoke<StabilityLlmConfigSaveResult>(
    "device_automation_stability_llm_config_save",
    config,
  );
}
