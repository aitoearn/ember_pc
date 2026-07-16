import { ArrowLeft, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ensureDeviceAutomationSidecar,
} from "@/lib/api/deviceAutomation";
import { sendAyaStyleMirrorNavigation } from "./scrcpy/deviceMirrorNavigation";
import { scheduleScrcpyPrewarmForDevice } from "./scrcpy/scrcpyPrewarm";
import {
  acquireDeviceScrcpySession,
  destroyDeviceScrcpySession,
} from "./scrcpy/deviceScrcpySessionStore";
import type { ScrcpyDirectClient } from "./scrcpy/ScrcpyDirectClient";
import { DeviceAutomationGeniePanel } from "./components/DeviceAutomationGeniePanel";
import { DeviceMirrorShell } from "./components/DeviceMirrorShell";
import { DevicePlatformBadge } from "./components/DevicePlatformBadge";
import {
  DeviceScrcpyPlayer,
  type DeviceScrcpyPlayerHandle,
} from "./components/DeviceScrcpyPlayer";
import type {
  DeviceAutomationExecutionMode,
  DeviceAutomationPerceptionKernel,
} from "./domain/workbenchPresentation";
import type { UiAgentEvent } from "./events";
import { inferAppPackageFromFlowSteps } from "./flow/domain/flowFormat";
import { useFlowLibrary } from "./flow/hooks/useFlowLibrary";
import { useFlowRecorder } from "./flow/hooks/useFlowRecorder";
import { useDeviceAiTask } from "./hooks/useDeviceAiTask";
import type { DeviceAutomationCardModel } from "./types";

interface DeviceAutomationDebugPageProps {
  device: DeviceAutomationCardModel | null;
  onBack: () => void;
}

export function DeviceAutomationDebugPage({
  device,
  onBack,
}: DeviceAutomationDebugPageProps) {
  const { t } = useTranslation("deviceAutomation");
  const [navigationPending, setNavigationPending] = useState<
    "back" | "home" | null
  >(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [executionMode, setExecutionMode] =
    useState<DeviceAutomationExecutionMode>("flexible");
  const [perceptionKernel, setPerceptionKernel] =
    useState<DeviceAutomationPerceptionKernel>("hybrid");
  const flowLibrary = useFlowLibrary();
  const flowRecorder = useFlowRecorder({
    device,
    workspaceId: flowLibrary.workspaceId,
  });

  const inferredFlowAppPackage = useMemo(
    () => inferAppPackageFromFlowSteps(flowRecorder.draftSteps),
    [flowRecorder.draftSteps],
  );

  const handleUiAgentEvent = useCallback(
    (event: UiAgentEvent) => {
      flowRecorder.ingestUiAgentEvent(event);
      if (
        event.type === "done" ||
        event.type === "error" ||
        event.type === "exit"
      ) {
        flowRecorder.finalizeVlmCapture();
      }
    },
    [flowRecorder],
  );

  const aiTask = useDeviceAiTask(device, { onUiAgentEvent: handleUiAgentEvent });
  const scrcpyPlayerRef = useRef<DeviceScrcpyPlayerHandle | null>(null);
  const pinnedDeviceRef = useRef<DeviceAutomationCardModel | null>(null);
  if (device?.status === "online") {
    pinnedDeviceRef.current = device;
  }
  const playerDevice = device ?? pinnedDeviceRef.current;
  const [scrcpyClient, setScrcpyClient] = useState<ScrcpyDirectClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function openScrcpySession() {
      if (
        !playerDevice ||
        playerDevice.status !== "online" ||
        playerDevice.platform !== "android"
      ) {
        setScrcpyClient(null);
        return;
      }
      const client = await acquireDeviceScrcpySession(playerDevice);
      if (!cancelled) {
        setScrcpyClient(client);
      } else {
        client.close();
      }
    }

    void openScrcpySession();

    return () => {
      cancelled = true;
      if (playerDevice?.platform === "android") {
        void destroyDeviceScrcpySession(playerDevice.id);
      }
      setScrcpyClient(null);
    };
  }, [playerDevice?.id, playerDevice?.platform, playerDevice?.status]);

  const handleBack = useCallback(() => {
    void (async () => {
      if (playerDevice?.platform === "android") {
        await destroyDeviceScrcpySession(playerDevice.id);
      }
      setScrcpyClient(null);
      onBack();
    })();
  }, [onBack, playerDevice?.id, playerDevice?.platform]);

  useEffect(() => {
    if (device?.platform !== "android" || device.status !== "online") {
      return;
    }
    scheduleScrcpyPrewarmForDevice(device.id);
    void ensureDeviceAutomationSidecar({
      warmDevice: {
        platform: device.agentPlatform,
        deviceId: device.id,
      },
    }).catch((error) => {
      console.warn("预热设备自动化 sidecar 失败:", error);
    });
  }, [device?.agentPlatform, device?.id, device?.platform, device?.status]);

  const canUseScrcpy = device?.platform === "android";
  const showNavigation =
    device?.platform === "android" || device?.platform === "ios";

  const handleNavigation = useCallback(
    async (action: "back" | "home") => {
      if (!device) {
        return;
      }
      setNavigationPending(action);
      setNavigationError(null);
      try {
        await sendAyaStyleMirrorNavigation({
          action,
          platform: device.agentPlatform,
          deviceId: device.id,
        });
      } catch (error) {
        console.error("发送导航指令失败:", error);
        setNavigationError(
          error instanceof Error
            ? error.message
            : t("deviceAutomation.debug.navigationError"),
        );
      } finally {
        setNavigationPending(null);
      }
    },
    [device, t],
  );

  const handleGenieSubmit = useCallback(
    async (instruction: string) => {
      flowRecorder.beginVlmCapture();
      await aiTask.submitInstruction(instruction);
    },
    [aiTask, flowRecorder],
  );

  const handleSaveAsFlow = useCallback(
    async (name: string, appPackage?: string) => {
      await flowRecorder.saveDraftAsFlow(name, appPackage);
      await flowLibrary.reload();
    },
    [flowLibrary, flowRecorder],
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col overflow-hidden bg-[#f0f1f3] px-1">
      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-0.5 h-8 shrink-0 gap-1.5"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            {t("deviceAutomation.debug.back")}
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Smartphone className="size-4 shrink-0 text-neutral-500" />
              <h1 className="truncate text-base font-semibold text-neutral-900">
                {device?.name ?? t("deviceAutomation.debug.title")}
              </h1>
              {device ? <DevicePlatformBadge platform={device.platform} /> : null}
              {device ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  {t(`deviceAutomation.status.${device.status}`)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {t("deviceAutomation.debug.workbenchSubtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <div className="flex min-h-[480px] min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm xl:min-h-0">
          {!playerDevice || playerDevice.status !== "online" ? (
            <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
              {t("deviceAutomation.debug.deviceUnavailable")}
            </div>
          ) : canUseScrcpy ? (
            <DeviceMirrorShell
              device={playerDevice}
              showNavigation={showNavigation}
              navigationPending={navigationPending}
              navigationError={navigationError}
              onNavigate={(action) => {
                void handleNavigation(action);
              }}
            >
              <DeviceScrcpyPlayer
                ref={scrcpyPlayerRef}
                device={playerDevice}
                directClient={scrcpyClient}
              />
            </DeviceMirrorShell>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">
                {t("deviceAutomation.debug.scrcpyUnsupportedPlatform")}
              </p>
            </div>
          )}
        </div>

        <DeviceAutomationGeniePanel
          steps={aiTask.steps}
          running={aiTask.running}
          aiReady={aiTask.aiReady}
          error={aiTask.error}
          finalMessage={aiTask.finalMessage}
          unavailable={aiTask.genieUnavailable}
          executionMode={executionMode}
          perceptionKernel={perceptionKernel}
          onExecutionModeChange={setExecutionMode}
          onPerceptionKernelChange={setPerceptionKernel}
          onSubmit={handleGenieSubmit}
          onCancel={aiTask.cancelTask}
          providers={aiTask.providers}
          selectedProviderId={aiTask.selectedProviderId}
          onProviderChange={aiTask.setSelectedProviderId}
          model={aiTask.model}
          onModelChange={aiTask.setModel}
          flowDraftStepCount={flowRecorder.draftSteps.length}
          defaultFlowAppPackage={inferredFlowAppPackage}
          onSaveAsFlow={handleSaveAsFlow}
        />
      </div>
    </div>
  );
}
