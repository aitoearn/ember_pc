import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  apiKeyProviderApi,
  type ProviderWithKeysDisplay,
} from "@/lib/api/apiKeyProvider";
import { FlowEditor } from "../flow/components/FlowEditor";
import { FlowLibraryPanel } from "../flow/components/FlowLibraryPanel";
import { FlowReplayView } from "../flow/components/FlowReplayView";
import { HealingRevisionDialog } from "../flow/components/HealingRevisionDialog";
import { useFlowHealing } from "../flow/hooks/useFlowHealing";
import { useFlowLibrary } from "../flow/hooks/useFlowLibrary";
import { useFlowReplay } from "../flow/hooks/useFlowReplay";
import type { DeviceAutomationCardModel } from "../types";

const DEFAULT_MODEL = "qwen3.7-plus";
const FREQUENT_HEALING_THRESHOLD = 3;

interface DeviceAutomationUiAutoTestPanelProps {
  devices: DeviceAutomationCardModel[];
}

/**
 * UI 自动测试 Tab：测试流库 + 编辑器 + 确定性回放 + 自愈修订。
 */
export function DeviceAutomationUiAutoTestPanel({
  devices,
}: DeviceAutomationUiAutoTestPanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const library = useFlowLibrary();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selfHealingEnabled, setSelfHealingEnabled] = useState(true);
  const [providers, setProviders] = useState<ProviderWithKeysDisplay[]>([]);
  const [providerId, setProviderId] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);

  const onlineAndroidDevices = useMemo(
    () =>
      devices.filter(
        (d) => d.status === "online" && d.platform === "android",
      ),
    [devices],
  );

  const selectedDevice = useMemo(
    () => onlineAndroidDevices.find((d) => d.id === selectedDeviceId) ?? null,
    [onlineAndroidDevices, selectedDeviceId],
  );

  useEffect(() => {
    if (selectedDeviceId && onlineAndroidDevices.some((d) => d.id === selectedDeviceId)) {
      return;
    }
    setSelectedDeviceId(onlineAndroidDevices[0]?.id ?? "");
  }, [onlineAndroidDevices, selectedDeviceId]);

  useEffect(() => {
    let cancelled = false;
    void apiKeyProviderApi
      .getProviders()
      .then((all) => {
        if (cancelled) {
          return;
        }
        const usable = all.filter((p) => p.enabled && p.api_key_count > 0);
        setProviders(usable);
        setProviderId((prev) => prev || (usable[0]?.id ?? ""));
      })
      .catch((loadError) => {
        console.warn("[测试流回放] 拉取模型 Provider 失败：", loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const replay = useFlowReplay({
    workspaceId: library.workspaceId,
    deviceId: selectedDevice?.id ?? "",
    serial: selectedDevice?.serial ?? "",
    selfHealingEnabled,
    providerId: selfHealingEnabled ? providerId : undefined,
    model: selfHealingEnabled ? model : undefined,
  });

  const healing = useFlowHealing(library.selectedFlowId);

  const frequentHealing =
    replay.state.steps.filter((s) => s.status === "healed").length >=
    FREQUENT_HEALING_THRESHOLD;

  const platformUnsupported =
    library.selectedFlow != null &&
    (library.selectedFlow.platform !== "android" ||
      !selectedDevice ||
      selectedDevice.platform !== "android");

  const handleAcceptHealing = (id: string) => {
    void (async () => {
      const result = await healing.resolve(id, "accepted");
      if (result.flow) {
        await library.saveFlow(result.flow);
      }
    })();
  };

  const handleFlagDefect = (id: string) => {
    void healing.resolve(id, "flagged_defect");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-neutral-900">
          {t("deviceAutomation.flow.library.title")}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t("deviceAutomation.flow.library.subtitle")}
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          {t("deviceAutomation.flow.library.hintDebug")}
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs text-neutral-600">
          {t("deviceAutomation.flow.replay.deviceLabel")}
          <select
            className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={replay.running}
          >
            {onlineAndroidDevices.length === 0 ? (
              <option value="">
                {t("deviceAutomation.flow.replay.noDevice")}
              </option>
            ) : (
              onlineAndroidDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.serial})
                </option>
              ))
            )}
          </select>
        </label>
        {selfHealingEnabled && providers.length > 0 ? (
          <label className="flex flex-col gap-1 text-xs text-neutral-600">
            Provider
            <select
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={replay.running}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <FlowLibraryPanel
          flows={library.flows}
          loading={library.loading}
          error={library.error}
          selectedFlowId={library.selectedFlowId}
          onSelect={(id) => void library.selectFlow(id)}
          onDelete={(id) => void library.removeFlows([id])}
        />
        <div className="flex flex-col gap-4">
          <FlowEditor
            flow={library.selectedFlow}
            onSave={async (flow) => {
              await library.saveFlow(flow);
            }}
          />
          <FlowReplayView
            flow={library.selectedFlow}
            state={replay.state}
            running={replay.running}
            selfHealingEnabled={selfHealingEnabled}
            onSelfHealingChange={setSelfHealingEnabled}
            onStart={() => {
              if (library.selectedFlow) {
                void replay.startReplay(library.selectedFlow);
              }
            }}
            onCancel={() => void replay.cancelReplay()}
            onPersist={() => void replay.persistRun()}
            platformUnsupported={platformUnsupported}
            frequentHealing={frequentHealing}
          />
          {replay.error ? (
            <p className="text-sm text-red-600">{replay.error}</p>
          ) : null}
          {!selfHealingEnabled && replay.state.status === "done" &&
          replay.state.conclusion !== "passed" ? (
            <p className="text-sm text-amber-700">
              {t("deviceAutomation.flow.healing.selfHealOffHint")}
            </p>
          ) : null}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">
              {t("deviceAutomation.flow.healing.title")}
            </h3>
            <HealingRevisionDialog
              revisions={healing.revisions}
              loading={healing.loading}
              onAccept={handleAcceptHealing}
              onFlagDefect={handleFlagDefect}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
