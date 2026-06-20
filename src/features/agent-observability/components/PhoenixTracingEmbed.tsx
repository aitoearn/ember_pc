import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildPhoenixTracingUrl,
  DEFAULT_PHOENIX_BASE_URL,
  PHOENIX_BASE_URL_STORAGE_KEY,
  probePhoenixHealth,
} from "../phoenixUrl";

export interface PhoenixTracingEmbedProps {
  initialBaseUrl?: string;
}

export function PhoenixTracingEmbed({ initialBaseUrl }: PhoenixTracingEmbedProps) {
  const { t } = useTranslation("agentObservability");
  const [baseUrl, setBaseUrl] = useState(
    () =>
      initialBaseUrl?.trim() ||
      localStorage.getItem(PHOENIX_BASE_URL_STORAGE_KEY)?.trim() ||
      DEFAULT_PHOENIX_BASE_URL,
  );
  const [draftUrl, setDraftUrl] = useState(baseUrl);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const tracingUrl = buildPhoenixTracingUrl(baseUrl);

  const checkHealth = useCallback(async (url: string) => {
    setChecking(true);
    try {
      const ok = await probePhoenixHealth(url);
      setHealthOk(ok);
      return ok;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth(baseUrl);
  }, [baseUrl, checkHealth]);

  const applyBaseUrl = useCallback(() => {
    const next = draftUrl.trim() || DEFAULT_PHOENIX_BASE_URL;
    setBaseUrl(next);
    localStorage.setItem(PHOENIX_BASE_URL_STORAGE_KEY, next);
    void checkHealth(next);
  }, [checkHealth, draftUrl]);

  const openExternal = useCallback(() => {
    void window.open(tracingUrl, "_blank", "noopener,noreferrer");
  }, [tracingUrl]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="phoenix-tracing-embed">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("agentObservability.tracing.baseUrlLabel")}
          </label>
          <Input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder={DEFAULT_PHOENIX_BASE_URL}
            data-testid="phoenix-base-url-input"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={applyBaseUrl}>
          {t("agentObservability.tracing.applyUrl")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={checking}
          onClick={() => void checkHealth(baseUrl)}
        >
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          {t("agentObservability.tracing.recheck")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openExternal}>
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          {t("agentObservability.tracing.openExternal")}
        </Button>
      </div>

      <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
        {healthOk === true
          ? t("agentObservability.tracing.healthOk", { url: tracingUrl })
          : healthOk === false
            ? t("agentObservability.tracing.healthFail")
            : t("agentObservability.tracing.healthChecking")}
      </p>

      {healthOk ? (
        <iframe
          title={t("agentObservability.tracing.iframeTitle")}
          src={tracingUrl}
          className="min-h-[480px] flex-1 rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-white"
          data-testid="phoenix-tracing-iframe"
        />
      ) : (
        <div
          className="flex min-h-[320px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface-muted,#f7f7f5)] px-6 text-center"
          data-testid="phoenix-tracing-empty"
        >
          <p className="text-sm font-medium">
            {t("agentObservability.tracing.emptyTitle")}
          </p>
          <p className="mt-2 max-w-lg text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("agentObservability.tracing.emptyHint")}
          </p>
        </div>
      )}
    </div>
  );
}
