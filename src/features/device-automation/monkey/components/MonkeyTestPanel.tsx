import { useTranslation } from "react-i18next";
import { ExploreRunHistoryPanel } from "../../explore/components/ExploreRunHistoryPanel";
import { ExploreRulesPanel } from "../../explore/components/ExploreRulesPanel";
import { useExploreProfile } from "../../explore/hooks/useExploreProfile";
import { useExploreRuns } from "../../explore/hooks/useExploreRuns";
import type { DeviceAutomationCardModel } from "../../types";
import { useMonkeyTest } from "../hooks/useMonkeyTest";
import { MonkeyTestLogPanel } from "./MonkeyTestLogPanel";
import { MonkeyTestToolbar } from "./MonkeyTestToolbar";

export interface MonkeyTestPanelProps {
  devices: DeviceAutomationCardModel[];
}

export function MonkeyTestPanel({ devices }: MonkeyTestPanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const explore = useExploreProfile();
  const exploreRuns = useExploreRuns(explore.workspaceId);
  const monkey = useMonkeyTest({
    devices,
    exploreRules: explore.rules,
    exploreConfig: explore.config,
    exploreProfileLoading: explore.loading,
    workspaceId: explore.workspaceId,
    onRunPersisted: () => void exploreRuns.reload(),
  });

  return (
    <div
      className="flex min-h-full flex-col gap-4"
      data-testid="monkey-test-panel"
    >
      <MonkeyTestToolbar
        onlineDevices={monkey.onlineDevices}
        selectedDeviceId={monkey.selectedDeviceId}
        onDeviceChange={monkey.setSelectedDeviceId}
        apps={monkey.apps}
        appsLoading={monkey.appsLoading}
        onRefreshApps={() => void monkey.refreshApps()}
        packageName={monkey.packageName}
        onPackageChange={monkey.setPackageName}
        engineMode={monkey.engineMode}
        onEngineModeChange={monkey.setEngineMode}
        eventCount={monkey.eventCount}
        onEventCountChange={monkey.setEventCount}
        throttleMs={monkey.throttleMs}
        onThrottleMsChange={monkey.setThrottleMs}
        runningMinutes={monkey.runningMinutes}
        onRunningMinutesChange={monkey.setRunningMinutes}
        profilePeriod={monkey.profilePeriod}
        onProfilePeriodChange={monkey.setProfilePeriod}
        takeScreenshots={monkey.takeScreenshots}
        onTakeScreenshotsChange={monkey.setTakeScreenshots}
        seed={monkey.seed}
        onSeedChange={monkey.setSeed}
        exploreRulesCount={monkey.exploreRulesCount}
        canRun={monkey.canRun}
        isRunning={monkey.isRunning}
        onStart={() => void monkey.start()}
        onStop={() => void monkey.stop()}
      />

      {!monkey.canRun && monkey.selectedDevice ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="monkey-platform-unsupported"
        >
          <p className="font-medium">
            {t("deviceAutomation.monkey.platform.unsupportedTitle")}
          </p>
          <p className="mt-1 text-amber-800/90">
            {t("deviceAutomation.monkey.platform.unsupportedDescription")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="min-h-0 lg:max-h-[min(560px,55vh)] lg:overflow-y-auto lg:overscroll-contain">
          <ExploreRulesPanel
            rules={explore.rules}
            config={explore.config}
            loading={explore.loading}
            saving={explore.saving}
            disabled={monkey.isRunning}
            onRulesChange={explore.setRules}
            onConfigChange={explore.setConfig}
            onSave={explore.saveCurrent}
          />
        </div>
        <MonkeyTestLogPanel
          logs={monkey.viewState.logs}
          isRunning={monkey.isRunning}
          lastSummary={monkey.lastSummary}
        />
      </div>

      <ExploreRunHistoryPanel
        runs={exploreRuns.runs}
        loading={exploreRuns.loading}
      />
    </div>
  );
}
