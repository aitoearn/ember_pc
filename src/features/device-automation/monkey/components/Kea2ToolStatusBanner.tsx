import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getKea2ToolStatus, type Kea2ToolStatus } from "@/lib/api/deviceAutomationKea2";

export function Kea2ToolStatusBanner() {
  const { t } = useTranslation("deviceAutomation");
  const [status, setStatus] = useState<Kea2ToolStatus | null>(null);

  useEffect(() => {
    void getKea2ToolStatus()
      .then(setStatus)
      .catch(() => {
        setStatus({
          available: false,
          error: t("deviceAutomation.monkey.kea2.statusUnknown"),
        });
      });
  }, [t]);

  if (!status) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        status.available
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
      data-testid="kea2-tool-status-banner"
    >
      {status.available ? (
        <p>
          {t("deviceAutomation.monkey.kea2.ready", {
            version: status.version ?? "?",
            root: status.toolRoot ?? "",
          })}
        </p>
      ) : (
        <>
          <p className="font-medium">{t("deviceAutomation.monkey.kea2.unavailableTitle")}</p>
          <p className="mt-1 text-amber-800/90">{status.error}</p>
        </>
      )}
    </div>
  );
}
