import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listDeviceAutomationDevices,
  listenDeviceAutomationInventoryChanged,
} from "@/lib/api/deviceAutomation";
import type {
  DeviceAutomationPageParams,
  DeviceAutomationWorkspaceTab,
  Page,
  PageParams,
} from "@/types/page";
import { projectAgentDevices } from "./domain/deviceProjection";
import {
  readCachedDeviceAutomationList,
  writeCachedDeviceAutomationList,
} from "./deviceListSessionCache";
import { scheduleScrcpyPrewarmForDevices } from "./scrcpy/scrcpyPrewarm";
import { DeviceAutomationDebugPage } from "./DeviceAutomationDebugPage";
import { DeviceAutomationListPage } from "./DeviceAutomationListPage";
import { PerformanceMonitorPanel } from "./performance/components/PerformanceMonitorPanel";
import { DeviceAutomationPlaceholderPanel } from "./components/DeviceAutomationPlaceholderPanel";
import { DeviceAutomationUiAutoTestPanel } from "./components/DeviceAutomationUiAutoTestPanel";
import { MonkeyTestPanel } from "./monkey/components/MonkeyTestPanel";
import { DeviceAutomationTabNav } from "./components/DeviceAutomationTabNav";
import { resolveDeviceAutomationWorkspaceTab } from "./constants/workspaceTabs";
import type { DeviceAutomationCardModel } from "./types";

interface DeviceAutomationWorkspaceProps {
  pageParams?: DeviceAutomationPageParams;
  onNavigate?: (page: Page, params?: PageParams) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "加载设备列表失败";
}

export function DeviceAutomationWorkspace({
  pageParams,
  onNavigate,
}: DeviceAutomationWorkspaceProps) {
  const view = pageParams?.view ?? "list";
  const activeTab = resolveDeviceAutomationWorkspaceTab(pageParams?.tab);
  const selectedDeviceId = pageParams?.deviceId?.trim() ?? "";
  const shouldLoadDevices =
    view === "debug" ||
    activeTab === "devices" ||
    activeTab === "performance" ||
    activeTab === "ui-auto-test" ||
    activeTab === "monkey-test";
  const sessionCachedDevices = readCachedDeviceAutomationList();
  const [devices, setDevices] = useState<DeviceAutomationCardModel[]>(
    () => sessionCachedDevices ?? [],
  );
  const [loading, setLoading] = useState(() => sessionCachedDevices === null);
  const [error, setError] = useState<string | null>(null);
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  const refreshDevices = useCallback(async (options?: { force?: boolean }) => {
    setError(null);
    const hasVisibleDevices = devicesRef.current.length > 0;
    if (!hasVisibleDevices) {
      setLoading(true);
    }
    try {
      const response = await listDeviceAutomationDevices(options);
      const projected = projectAgentDevices(response.devices ?? []);
      writeCachedDeviceAutomationList(projected);
      setDevices(projected);
    } catch (refreshError) {
      console.error("刷新设备列表失败:", refreshError);
      setError(getErrorMessage(refreshError));
      if (!hasVisibleDevices) {
        setDevices([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoadDevices) {
      return;
    }
    void refreshDevices();
  }, [refreshDevices, shouldLoadDevices]);

  useEffect(() => {
    if (!shouldLoadDevices) {
      return;
    }
    let disposed = false;
    let unlisten: (() => void) | null = null;
    void listenDeviceAutomationInventoryChanged(() => {
      void refreshDevices();
    })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch((listenError) => {
        console.warn("监听设备列表变化失败:", listenError);
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refreshDevices, shouldLoadDevices]);

  useEffect(() => {
    if (!shouldLoadDevices || loading || devices.length === 0) {
      return;
    }
    scheduleScrcpyPrewarmForDevices(devices);
  }, [devices, loading, shouldLoadDevices]);

  const selectedDevice = useMemo(() => {
    if (!selectedDeviceId) {
      return null;
    }
    return devices.find((device) => device.id === selectedDeviceId) ?? null;
  }, [devices, selectedDeviceId]);

  const traceLeaveGuardRef = useRef<(() => boolean) | null>(null);

  const handleTraceLeaveGuardChange = useCallback((guard: (() => boolean) | null) => {
    traceLeaveGuardRef.current = guard;
  }, []);

  const openDebug = useCallback(
    (deviceId: string) => {
      onNavigate?.("device-automation", {
        view: "debug",
        deviceId,
        tab: "devices",
      });
    },
    [onNavigate],
  );

  const backToList = useCallback(() => {
    onNavigate?.("device-automation", {
      view: "list",
      tab: "devices",
    });
  }, [onNavigate]);

  const handleTabChange = useCallback(
    (tab: DeviceAutomationWorkspaceTab) => {
      if (activeTab === "performance" && tab !== "performance") {
        const guard = traceLeaveGuardRef.current;
        if (guard && !guard()) {
          return;
        }
      }
      onNavigate?.("device-automation", {
        view: "list",
        tab,
      });
    },
    [activeTab, onNavigate],
  );

  if (view === "debug") {
    return (
      <DeviceAutomationDebugPage
        device={selectedDevice}
        onBack={backToList}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[color:var(--ember-app-bg,#faf9f6)] text-[color:var(--ember-text,#4a4a45)]">
      <DeviceAutomationTabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === "devices" ? (
          <DeviceAutomationListPage
            devices={devices}
            loading={loading}
            error={error}
            onRefresh={() => refreshDevices({ force: true })}
            onOpenDebug={openDebug}
          />
        ) : activeTab === "performance" ? (
          <PerformanceMonitorPanel
            devices={devices}
            onTraceLeaveGuardChange={handleTraceLeaveGuardChange}
          />
        ) : activeTab === "ui-auto-test" ? (
          <DeviceAutomationUiAutoTestPanel devices={devices} />
        ) : activeTab === "monkey-test" ? (
          <MonkeyTestPanel devices={devices} />
        ) : (
          <DeviceAutomationPlaceholderPanel tab={activeTab} />
        )}
      </div>
    </div>
  );
}

export default DeviceAutomationWorkspace;
