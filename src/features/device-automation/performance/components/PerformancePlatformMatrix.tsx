import { useTranslation } from "react-i18next";
import {
  PERF_PLATFORM_MATRIX_ROWS,
  type PerfPlatformSupportLevel,
} from "../constants/platformMatrix";

const SUPPORT_LABEL_KEYS: Record<
  PerfPlatformSupportLevel,
  "deviceAutomation.performance.matrix.support.p1" | "deviceAutomation.performance.matrix.support.planned" | "deviceAutomation.performance.matrix.support.partial" | "deviceAutomation.performance.matrix.support.unsupported"
> = {
  p1: "deviceAutomation.performance.matrix.support.p1",
  planned: "deviceAutomation.performance.matrix.support.planned",
  partial: "deviceAutomation.performance.matrix.support.partial",
  unsupported: "deviceAutomation.performance.matrix.support.unsupported",
};

export function PerformancePlatformMatrix() {
  const { t } = useTranslation("deviceAutomation");

  return (
    <div
      className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      data-testid="performance-platform-matrix"
    >
      <h3 className="text-sm font-semibold text-neutral-900">
        {t("deviceAutomation.performance.matrix.title")}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-neutral-500">
              <th className="py-2 pr-4 font-medium">
                {t("deviceAutomation.performance.toolbar.metrics")}
              </th>
              <th className="py-2 px-3 font-medium">
                {t("deviceAutomation.performance.matrix.android")}
              </th>
              <th className="py-2 px-3 font-medium">
                {t("deviceAutomation.performance.matrix.ios")}
              </th>
              <th className="py-2 px-3 font-medium">
                {t("deviceAutomation.performance.matrix.harmony")}
              </th>
            </tr>
          </thead>
          <tbody>
            {PERF_PLATFORM_MATRIX_ROWS.map((row) => (
              <tr key={row.metricId} className="border-b border-neutral-100">
                <td className="py-2 pr-4 text-neutral-800">{t(row.labelKey)}</td>
                <td className="py-2 px-3 text-neutral-600">
                  {t(SUPPORT_LABEL_KEYS[row.android])}
                </td>
                <td className="py-2 px-3 text-neutral-600">
                  {t(SUPPORT_LABEL_KEYS[row.ios])}
                </td>
                <td className="py-2 px-3 text-neutral-600">
                  {t(SUPPORT_LABEL_KEYS[row.harmony])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
