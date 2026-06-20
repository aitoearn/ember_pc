import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PerformanceSession, PerfMetricKey } from "../types";

const METRIC_LABEL_KEYS = {
  cpu_app: "deviceAutomation.performance.charts.cpuApp",
  cpu_sys: "deviceAutomation.performance.charts.cpuSys",
  mem_total: "deviceAutomation.performance.charts.memory",
  fps: "deviceAutomation.performance.charts.fps",
} as const satisfies Record<PerfMetricKey, `deviceAutomation.${string}`>;

export interface PerformanceSessionSummaryModalProps {
  session: PerformanceSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function PerformanceSessionSummaryModal({
  session,
  open,
  onOpenChange,
}: PerformanceSessionSummaryModalProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("deviceAutomation.performance.summary.title")}</DialogTitle>
        </DialogHeader>
        {session ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 text-neutral-600">
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.device")}:{" "}
                </span>
                {session.deviceId}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.app")}:{" "}
                </span>
                {session.packageName}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.startedAt")}:{" "}
                </span>
                {formatTime(session.startedAt)}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.summary.stoppedAt")}:{" "}
                </span>
                {formatTime(session.stoppedAt)}
              </div>
              <div>
                <span className="text-neutral-500">
                  {t("deviceAutomation.performance.session.statusLabel")}:{" "}
                </span>
                {t(`deviceAutomation.performance.session.status.${session.status}`)}
              </div>
            </div>

            {session.summary && Object.keys(session.summary).length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.toolbar.metrics")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.avg")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.max")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("deviceAutomation.performance.summary.min")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(session.summary) as PerfMetricKey[]).map((key) => {
                      const metric = session.summary?.[key];
                      if (!metric) {
                        return null;
                      }
                      return (
                        <tr key={key} className="border-b border-neutral-100">
                          <td className="px-3 py-2 text-neutral-800">
                            {t(METRIC_LABEL_KEYS[key])}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.avg.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.max.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-neutral-600">
                            {metric.min.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-neutral-500">
                {t("deviceAutomation.performance.summary.empty")}
              </p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
