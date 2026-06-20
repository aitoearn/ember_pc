import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { listPerformanceApps } from "@/lib/api/deviceAutomationPerformance";
import {
  getMonkeyTestStatus,
  startMonkeyTest,
  stopMonkeyTest,
} from "@/lib/api/deviceAutomationMonkey";
import { saveDeviceExploreRun } from "@/lib/api/deviceExplore";
import { safeListen } from "@/lib/dev-bridge";
import { buildExploreRunFromMonkeySession } from "../../explore/domain/buildExploreRun";
import type {
  ExploreConfig,
  ExploreRule,
} from "../../explore/types";
import type { DeviceAutomationCardModel } from "../../types";
import {
  MONKEY_DEFAULT_ENGINE_MODE,
  MONKEY_DEFAULT_EVENT_COUNT,
  MONKEY_DEFAULT_PROFILE_PERIOD,
  MONKEY_DEFAULT_RUNNING_MINUTES,
  MONKEY_DEFAULT_THROTTLE_MS,
} from "../constants/defaults";
import { isAndroidMonkeySupported } from "../constants/platform";
import {
  appendMonkeyEvent,
  countMonkeyIncidents,
  initialMonkeySessionState,
  type MonkeySessionViewState,
} from "../domain/monkeySessionProjection";
import {
  DEVICE_AUTOMATION_MONKEY_EVENT,
  type DeviceAutomationMonkeyEventPayload,
} from "../events";
import type { MonkeyEngineMode, MonkeySessionSummary } from "../types";

export interface UseMonkeyTestOptions {
  devices: DeviceAutomationCardModel[];
  exploreRules?: ExploreRule[];
  exploreConfig?: ExploreConfig;
  exploreProfileLoading?: boolean;
  workspaceId?: string;
  onRunPersisted?: () => void;
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return String(error);
}

export function useMonkeyTest({
  devices,
  exploreRules = [],
  exploreConfig,
  exploreProfileLoading = false,
  workspaceId = "",
  onRunPersisted,
}: UseMonkeyTestOptions) {
  const { t } = useTranslation("deviceAutomation");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [apps, setApps] = useState<{ packageName: string; label?: string }[]>(
    [],
  );
  const [appsLoading, setAppsLoading] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [engineMode, setEngineMode] = useState<MonkeyEngineMode>(
    MONKEY_DEFAULT_ENGINE_MODE,
  );
  const [eventCount, setEventCount] = useState(MONKEY_DEFAULT_EVENT_COUNT);
  const [throttleMs, setThrottleMs] = useState(MONKEY_DEFAULT_THROTTLE_MS);
  const [runningMinutes, setRunningMinutes] = useState(
    MONKEY_DEFAULT_RUNNING_MINUTES,
  );
  const [profilePeriod, setProfilePeriod] = useState(
    MONKEY_DEFAULT_PROFILE_PERIOD,
  );
  const [takeScreenshots, setTakeScreenshots] = useState(false);
  const [seed, setSeed] = useState("");
  const [viewState, setViewState] = useState<MonkeySessionViewState>(
    initialMonkeySessionState,
  );
  const [lastSummary, setLastSummary] = useState<MonkeySessionSummary | null>(
    null,
  );

  const activeSessionRef = useRef<string | null>(null);
  const acceptingMonkeyEventsRef = useRef(false);
  const phaseRef = useRef(viewState.phase);
  const workspaceIdRef = useRef(workspaceId);
  const exploreRulesRef = useRef(exploreRules);
  const onRunPersistedRef = useRef(onRunPersisted);
  activeSessionRef.current =
    viewState.summary?.sessionId ?? activeSessionRef.current;
  phaseRef.current = viewState.phase;
  workspaceIdRef.current = workspaceId;
  exploreRulesRef.current = exploreRules;
  onRunPersistedRef.current = onRunPersisted;

  const onlineDevices = useMemo(
    () => devices.filter((device) => device.status === "online"),
    [devices],
  );

  const selectedDevice = useMemo(
    () => onlineDevices.find((device) => device.id === selectedDeviceId) ?? null,
    [onlineDevices, selectedDeviceId],
  );

  const canRun = isAndroidMonkeySupported(selectedDevice?.platform);
  const isRunning = viewState.phase === "running";

  const refreshApps = useCallback(async () => {
    if (!selectedDevice || !canRun) {
      setApps([]);
      return;
    }
    setAppsLoading(true);
    try {
      const listed = await listPerformanceApps({
        platform: "android",
        deviceId: selectedDevice.id,
      });
      setApps(listed);
      if (listed.length > 0 && !packageName) {
        setPackageName(listed[0].packageName);
      }
    } catch (error) {
      console.error("加载应用列表失败:", error);
      toast.error(toMessage(error));
    } finally {
      setAppsLoading(false);
    }
  }, [canRun, packageName, selectedDevice]);

  useEffect(() => {
    if (selectedDeviceId && onlineDevices.some((d) => d.id === selectedDeviceId)) {
      return;
    }
    setSelectedDeviceId(onlineDevices[0]?.id ?? "");
  }, [onlineDevices, selectedDeviceId]);

  useEffect(() => {
    void refreshApps();
  }, [refreshApps]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    void safeListen<DeviceAutomationMonkeyEventPayload>(
      DEVICE_AUTOMATION_MONKEY_EVENT,
      (event) => {
        const payload = event.payload;
        if (!payload?.sessionId) {
          return;
        }
        const boundSessionId = activeSessionRef.current;
        if (boundSessionId && payload.sessionId !== boundSessionId) {
          return;
        }
        if (!boundSessionId && !acceptingMonkeyEventsRef.current) {
          return;
        }
        if (!boundSessionId) {
          activeSessionRef.current = payload.sessionId;
        }
        const sessionId = activeSessionRef.current;
        if (!sessionId) {
          return;
        }
        setViewState((prev) => {
          const next = appendMonkeyEvent(prev, payload, sessionId);
          if (payload.line.type !== "done") {
            return next;
          }
          acceptingMonkeyEventsRef.current = false;
          const incidents = countMonkeyIncidents(next.logs);
          if (prev.summary) {
            const completedSummary: MonkeySessionSummary = {
              ...prev.summary,
              stoppedAt: new Date().toISOString(),
              conclusion:
                incidents.anrCount > 0
                  ? "anr"
                  : incidents.crashCount > 0
                    ? "crashed"
                    : "completed",
              eventsInjected: payload.line.eventsInjected,
              crashCount: incidents.crashCount,
              anrCount: incidents.anrCount,
              localResultDir: payload.line.localResultDir,
              bugReportPath: payload.line.bugReportPath,
              stepsLogPath: payload.line.stepsLogPath,
              stepsSummary: payload.line.stepsSummary,
            };
            setLastSummary(completedSummary);
            const currentWorkspaceId = workspaceIdRef.current;
            if (currentWorkspaceId) {
              const exploreRulesCount = exploreRulesRef.current.filter(
                (rule) => rule.enabled,
              ).length;
              const runRecord = buildExploreRunFromMonkeySession(
                currentWorkspaceId,
                completedSummary,
                next.logs,
                exploreRulesCount,
              );
              void saveDeviceExploreRun(runRecord)
                .then(() => onRunPersistedRef.current?.())
                .catch((error) => {
                  console.error("探索压测运行留痕失败:", error);
                });
            }
          }
          activeSessionRef.current = null;
          return { ...next, phase: "idle" };
        });
      },
    ).then((fn) => {
      unlisten = fn;
    }).catch((error) => {
      console.warn("订阅 Monkey 压测事件失败:", error);
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const start = useCallback(async () => {
    if (!selectedDevice || !packageName.trim()) {
      toast.error(t("deviceAutomation.monkey.errors.noApp"));
      return;
    }
    if (!canRun) {
      toast.error(t("deviceAutomation.monkey.errors.unsupportedPlatform"));
      return;
    }
    acceptingMonkeyEventsRef.current = true;
    activeSessionRef.current = null;
    phaseRef.current = "running";
    setViewState({
      phase: "running",
      logs: [],
      summary: null,
    });
    setLastSummary(null);
    try {
      const seedNum = seed.trim() ? Number(seed) : undefined;
      const result = await startMonkeyTest({
        deviceId: selectedDevice.id,
        packageName: packageName.trim(),
        mode: engineMode,
        eventCount,
        throttleMs,
        runningMinutes,
        seed:
          seedNum !== undefined && Number.isFinite(seedNum) ? seedNum : undefined,
        profilePeriod: engineMode === "fastbot" ? profilePeriod : undefined,
        takeScreenshots: engineMode === "fastbot" ? takeScreenshots : undefined,
        exploreRules: engineMode === "fastbot" ? exploreRules : undefined,
        exploreConfig:
          engineMode === "fastbot" ? exploreConfig : undefined,
      });
      activeSessionRef.current = result.sessionId;
      setViewState((prev) => ({
        phase: "running",
        logs: prev.logs,
        summary: {
          sessionId: result.sessionId,
          deviceId: selectedDevice.id,
          packageName: packageName.trim(),
          mode: result.mode,
          eventCount,
          throttleMs,
          seed: seedNum,
          runningMinutes,
          startedAt: result.startedAt,
          crashCount: 0,
          anrCount: 0,
        },
      }));
    } catch (error) {
      acceptingMonkeyEventsRef.current = false;
      setViewState(initialMonkeySessionState);
      activeSessionRef.current = null;
      toast.error(toMessage(error));
    }
  }, [
    canRun,
    engineMode,
    eventCount,
    packageName,
    profilePeriod,
    runningMinutes,
    seed,
    selectedDevice,
    takeScreenshots,
    throttleMs,
    exploreRules,
    exploreConfig,
    t,
  ]);

  const stop = useCallback(async () => {
    const sessionId = activeSessionRef.current;
    if (!sessionId) {
      return;
    }
    setViewState((prev) => ({ ...prev, phase: "stopping" }));
    try {
      await stopMonkeyTest(sessionId);
    } catch (error) {
      toast.error(toMessage(error));
      setViewState((prev) => ({ ...prev, phase: "running" }));
    }
  }, []);

  return {
    onlineDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    selectedDevice,
    canRun,
    apps,
    appsLoading,
    refreshApps,
    packageName,
    setPackageName,
    engineMode,
    setEngineMode,
    eventCount,
    setEventCount,
    throttleMs,
    setThrottleMs,
    runningMinutes,
    setRunningMinutes,
    profilePeriod,
    setProfilePeriod,
    takeScreenshots,
    setTakeScreenshots,
    seed,
    setSeed,
    viewState,
    lastSummary,
    isRunning,
    start,
    stop,
    exploreRulesCount: exploreRules.filter((rule) => rule.enabled).length,
    exploreProfileLoading,
  };
}
