import { Loader2, Play, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeviceAutomationCardModel } from "../../types";
import {
  PERF_INTERVAL_OPTIONS_MS,
  PERF_METRIC_OPTIONS,
  type PerfIntervalMs,
} from "../constants/metrics";
import type { PerfMetricId, PerformanceInstalledApp } from "../types";

export interface PerformanceMonitorToolbarProps {
  onlineDevices: DeviceAutomationCardModel[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  apps: PerformanceInstalledApp[];
  appsLoading: boolean;
  onRefreshApps: () => void;
  packageName: string;
  onPackageChange: (packageName: string) => void;
  metrics: PerfMetricId[];
  onToggleMetric: (metricId: PerfMetricId, checked: boolean) => void;
  intervalMs: PerfIntervalMs;
  onIntervalChange: (intervalMs: PerfIntervalMs) => void;
  canCollect: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function PerformanceMonitorToolbar({
  onlineDevices,
  selectedDeviceId,
  onDeviceChange,
  apps,
  appsLoading,
  onRefreshApps,
  packageName,
  onPackageChange,
  metrics,
  onToggleMetric,
  intervalMs,
  onIntervalChange,
  canCollect,
  isRunning,
  onStart,
  onStop,
}: PerformanceMonitorToolbarProps) {
  const { t } = useTranslation("deviceAutomation");
  const startDisabled =
    !canCollect || isRunning || !selectedDeviceId || !packageName || metrics.length === 0;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      data-testid="performance-monitor-toolbar"
    >
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          {t("deviceAutomation.performance.title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("deviceAutomation.performance.subtitle")}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.performance.toolbar.device")}
          </label>
          <Select
            value={selectedDeviceId || undefined}
            onValueChange={onDeviceChange}
            disabled={isRunning}
          >
            <SelectTrigger data-testid="performance-device-select">
              <SelectValue
                placeholder={t("deviceAutomation.performance.devices.empty")}
              />
            </SelectTrigger>
            <SelectContent>
              {onlineDevices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name} ({device.serial})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-neutral-600">
              {t("deviceAutomation.performance.toolbar.app")}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRefreshApps}
              disabled={!canCollect || appsLoading || isRunning}
            >
              {appsLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              {t("deviceAutomation.performance.toolbar.refreshApps")}
            </Button>
          </div>
          <Select
            value={packageName || undefined}
            onValueChange={onPackageChange}
            disabled={!canCollect || isRunning || apps.length === 0}
          >
            <SelectTrigger data-testid="performance-app-select">
              <SelectValue
                placeholder={t("deviceAutomation.performance.apps.empty")}
              />
            </SelectTrigger>
            <SelectContent>
              {apps.map((app) => (
                <SelectItem key={app.packageName} value={app.packageName}>
                  {app.label ?? app.packageName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.performance.toolbar.interval")}
          </label>
          <Select
            value={String(intervalMs)}
            onValueChange={(value) => onIntervalChange(Number(value) as PerfIntervalMs)}
            disabled={isRunning}
          >
            <SelectTrigger data-testid="performance-interval-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERF_INTERVAL_OPTIONS_MS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {t(`deviceAutomation.performance.interval.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={onStart}
            disabled={startDisabled}
            data-testid="performance-start-button"
          >
            <Play className="mr-1.5 h-4 w-4" />
            {t("deviceAutomation.performance.toolbar.start")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onStop}
            disabled={!isRunning}
            data-testid="performance-stop-button"
          >
            <Square className="mr-1.5 h-4 w-4" />
            {t("deviceAutomation.performance.toolbar.stop")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <span className="text-xs font-medium text-neutral-600">
          {t("deviceAutomation.performance.toolbar.metrics")}
        </span>
        {PERF_METRIC_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 text-sm text-neutral-700"
          >
            <Checkbox
              checked={metrics.includes(option.id)}
              disabled={isRunning}
              onCheckedChange={(checked) =>
                onToggleMetric(option.id, checked === true)
              }
            />
            {t(option.labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}
