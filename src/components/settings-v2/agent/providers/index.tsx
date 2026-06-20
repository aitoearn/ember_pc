import { useTranslation } from "react-i18next";
import { ApiKeyProviderSection } from "@/components/api-key-provider";
import { useOemCloudAccess } from "@/hooks/useOemCloudAccess";
import type { SettingsProviderView } from "@/types/page";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function NoticeBar(props: { tone: "error" | "success"; message: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm shadow-sm shadow-slate-950/5",
        props.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {props.tone === "success" ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{props.message}</span>
    </div>
  );
}

export interface CloudProviderSettingsProps {
  initialView?: SettingsProviderView;
}

export function CloudProviderSettings(_props: CloudProviderSettingsProps) {
  const { t } = useTranslation("settings");
  const { errorMessage, infoMessage } = useOemCloudAccess();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h1
          className="text-2xl font-semibold tracking-normal text-slate-950"
          data-testid="provider-settings-title"
        >
          {t("settings.tab.providers")}
        </h1>
      </div>
      {errorMessage ? <NoticeBar tone="error" message={errorMessage} /> : null}
      {infoMessage ? <NoticeBar tone="success" message={infoMessage} /> : null}

      <ApiKeyProviderSection className="h-[calc(100vh-280px)] min-h-[520px] max-h-[780px]" />
    </div>
  );
}
