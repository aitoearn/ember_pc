import { Loader2, Play, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeviceAutomationCardModel } from "../../types";
import {
  MONKEY_EVENT_COUNT_OPTIONS,
  MONKEY_ENGINE_MODES,
  MONKEY_PROFILE_PERIOD_OPTIONS,
  MONKEY_RUNNING_MINUTES_OPTIONS,
  MONKEY_THROTTLE_OPTIONS_MS,
} from "../constants/defaults";
import type { MonkeyEngineMode } from "../types";

export interface MonkeyTestToolbarProps {
  onlineDevices: DeviceAutomationCardModel[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  apps: { packageName: string; label?: string }[];
  appsLoading: boolean;
  onRefreshApps: () => void;
  packageName: string;
  onPackageChange: (packageName: string) => void;
  engineMode: MonkeyEngineMode;
  onEngineModeChange: (value: MonkeyEngineMode) => void;
  eventCount: number;
  onEventCountChange: (value: number) => void;
  throttleMs: number;
  onThrottleMsChange: (value: number) => void;
  runningMinutes: number;
  onRunningMinutesChange: (value: number) => void;
  profilePeriod: number;
  onProfilePeriodChange: (value: number) => void;
  takeScreenshots: boolean;
  onTakeScreenshotsChange: (value: boolean) => void;
  seed: string;
  onSeedChange: (value: string) => void;
  canRun: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  exploreRulesCount?: number;
}

export function MonkeyTestToolbar({
  onlineDevices,
  selectedDeviceId,
  onDeviceChange,
  apps,
  appsLoading,
  onRefreshApps,
  packageName,
  onPackageChange,
  engineMode,
  onEngineModeChange,
  eventCount,
  onEventCountChange,
  throttleMs,
  onThrottleMsChange,
  runningMinutes,
  onRunningMinutesChange,
  profilePeriod,
  onProfilePeriodChange,
  takeScreenshots,
  onTakeScreenshotsChange,
  seed,
  onSeedChange,
  canRun,
  isRunning,
  onStart,
  onStop,
  exploreRulesCount = 0,
}: MonkeyTestToolbarProps) {
  const { t } = useTranslation("deviceAutomation");
  const startDisabled =
    !canRun || isRunning || !selectedDeviceId || !packageName.trim();
  const isFastbot = engineMode === "fastbot";

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      data-testid="monkey-test-toolbar"
    >
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          {t("deviceAutomation.monkey.title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("deviceAutomation.monkey.subtitle")}
          {exploreRulesCount > 0
            ? ` · ${t("deviceAutomation.monkey.toolbar.exploreRulesLoaded", {
                count: exploreRulesCount,
              })}`
            : null}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.monkey.toolbar.device")}
          </label>
          <Select
            value={selectedDeviceId || undefined}
            onValueChange={onDeviceChange}
            disabled={isRunning}
          >
            <SelectTrigger data-testid="monkey-device-select">
              <SelectValue
                placeholder={t("deviceAutomation.monkey.devices.empty")}
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
              {t("deviceAutomation.monkey.toolbar.app")}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRefreshApps}
              disabled={!canRun || appsLoading || isRunning}
            >
              {appsLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              {t("deviceAutomation.monkey.toolbar.refreshApps")}
            </Button>
          </div>
          <Select
            value={packageName || undefined}
            onValueChange={onPackageChange}
            disabled={!canRun || isRunning}
          >
            <SelectTrigger data-testid="monkey-app-select">
              <SelectValue
                placeholder={t("deviceAutomation.monkey.toolbar.appPlaceholder")}
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
            {t("deviceAutomation.monkey.toolbar.engineMode")}
          </label>
          <Select
            value={engineMode}
            onValueChange={(v) => onEngineModeChange(v as MonkeyEngineMode)}
            disabled={isRunning}
          >
            <SelectTrigger data-testid="monkey-engine-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONKEY_ENGINE_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`deviceAutomation.monkey.toolbar.engineMode.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {isFastbot
              ? t("deviceAutomation.monkey.toolbar.maxSteps")
              : t("deviceAutomation.monkey.toolbar.eventCount")}
          </label>
          <Select
            value={String(eventCount)}
            onValueChange={(v) => onEventCountChange(Number(v))}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONKEY_EVENT_COUNT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.monkey.toolbar.throttle")}
          </label>
          <Select
            value={String(throttleMs)}
            onValueChange={(v) => onThrottleMsChange(Number(v))}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONKEY_THROTTLE_OPTIONS_MS.map((ms) => (
                <SelectItem key={ms} value={String(ms)}>
                  {ms} ms
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.monkey.toolbar.runningMinutes")}
          </label>
          <Select
            value={String(runningMinutes)}
            onValueChange={(v) => onRunningMinutesChange(Number(v))}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONKEY_RUNNING_MINUTES_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} {t("deviceAutomation.monkey.toolbar.minutes")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFastbot ? (
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-600">
              {t("deviceAutomation.monkey.toolbar.profilePeriod")}
            </label>
            <Select
              value={String(profilePeriod)}
              onValueChange={(v) => onProfilePeriodChange(Number(v))}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONKEY_PROFILE_PERIOD_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {t("deviceAutomation.monkey.toolbar.steps")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            {t("deviceAutomation.monkey.toolbar.seed")}
          </label>
          <Input
            value={seed}
            onChange={(e) => onSeedChange(e.target.value)}
            placeholder={t("deviceAutomation.monkey.toolbar.seedPlaceholder")}
            disabled={isRunning}
            className="h-9"
          />
        </div>

        {isFastbot ? (
          <div className="flex items-end gap-2 pb-1">
            <Checkbox
              id="monkey-take-screenshots"
              checked={takeScreenshots}
              onCheckedChange={(checked) =>
                onTakeScreenshotsChange(checked === true)
              }
              disabled={isRunning}
            />
            <label
              htmlFor="monkey-take-screenshots"
              className="text-sm text-neutral-700"
            >
              {t("deviceAutomation.monkey.toolbar.takeScreenshots")}
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {isRunning ? (
          <Button type="button" variant="destructive" size="sm" onClick={onStop}>
            <Square className="mr-1.5 size-4" />
            {t("deviceAutomation.monkey.toolbar.stop")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={startDisabled}
            onClick={onStart}
            data-testid="monkey-start-button"
          >
            <Play className="mr-1.5 size-4" />
            {t("deviceAutomation.monkey.toolbar.start")}
          </Button>
        )}
      </div>
    </div>
  );
}
