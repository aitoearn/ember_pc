import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  readStabilityLlmConfig,
  saveStabilityLlmConfig,
  type StabilityLlmConfigSaveInput,
} from "@/lib/api/stabilityLlmConfig";
import type { StabilityLlmConfig } from "../types";

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return String(error);
}

const EMPTY_DRAFT: StabilityLlmConfigSaveInput = {
  baseUrl: "",
  model: "",
  apiKey: "",
  provider: "openai",
};

export function useStabilityLlmConfig() {
  const { t } = useTranslation("deviceAutomation");
  const [config, setConfig] = useState<StabilityLlmConfig | null>(null);
  const [draft, setDraft] = useState<StabilityLlmConfigSaveInput>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await readStabilityLlmConfig();
      setConfig(loaded);
      setDraft({
        baseUrl: loaded.baseUrl,
        model: loaded.model,
        apiKey: loaded.apiKey,
        provider: loaded.provider ?? "openai",
      });
    } catch (error) {
      console.error("读取稳定性 LLM 配置失败:", error);
      toast.error(toMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await saveStabilityLlmConfig(draft);
      await reload();
      toast.success(t("deviceAutomation.stability.llm.saveSuccess"));
    } catch (error) {
      console.error("保存稳定性 LLM 配置失败:", error);
      toast.error(toMessage(error));
    } finally {
      setSaving(false);
    }
  }, [draft, reload, t]);

  const updateDraft = useCallback(
    (patch: Partial<StabilityLlmConfigSaveInput>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  return {
    config,
    draft,
    updateDraft,
    loading,
    saving,
    save,
    reload,
    isConfigured: config?.configured ?? false,
  };
}
