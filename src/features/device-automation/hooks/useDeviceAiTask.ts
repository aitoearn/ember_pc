import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiKeyProviderApi,
  type ProviderWithKeysDisplay,
} from "@/lib/api/apiKeyProvider";
import {
  cancelUiAgent,
  listenUiAgentEvents,
  startUiAgent,
} from "@/lib/api/uiAgent";
import type { UiAgentEvent } from "../events";
import type {
  DeviceAutomationCardModel,
  DeviceAutomationGenieStep,
} from "../types";

const DEFAULT_MODEL = "qwen3.7-plus";
const DEFAULT_MAX_STEPS = 20;

function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ui-agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 把单个 sidecar 事件投影到步骤时间轴上（不可变更新）。 */
function projectEvent(
  steps: DeviceAutomationGenieStep[],
  event: UiAgentEvent,
): DeviceAutomationGenieStep[] {
  switch (event.type) {
    case "step": {
      if (steps.some((s) => s.index === event.step)) {
        return steps.map((s) =>
          s.index === event.step ? { ...s, status: "running" } : s,
        );
      }
      return [
        ...steps,
        { index: event.step, desc: `Step ${event.step}`, status: "running" },
      ];
    }
    case "screenshot":
      return steps.map((s) =>
        s.index === event.step
          ? {
              ...s,
              screenshot: `data:${event.mediaType};base64,${event.imageBase64}`,
            }
          : s,
      );
    case "thought":
      return steps.map((s) =>
        s.index === event.step ? { ...s, thought: event.text } : s,
      );
    case "action":
      return steps.map((s) =>
        s.index === event.step ? { ...s, action: event.text } : s,
      );
    case "result":
      return steps.map((s) =>
        s.index === event.step
          ? {
              ...s,
              status: "completed",
              duration: Math.round(event.durationMs / 100) / 10,
            }
          : s,
      );
    default:
      return steps;
  }
}

export function useDeviceAiTask(
  device: DeviceAutomationCardModel | null,
  options?: { onUiAgentEvent?: (event: UiAgentEvent) => void },
) {
  const [steps, setSteps] = useState<DeviceAutomationGenieStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalMessage, setFinalMessage] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderWithKeysDisplay[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);

  const unlistenRef = useRef<(() => void) | null>(null);
  const taskIdRef = useRef<string | null>(null);

  // 拉取可用 Provider（启用且已配置 Key）
  useEffect(() => {
    let cancelled = false;
    void apiKeyProviderApi
      .getProviders()
      .then((all) => {
        if (cancelled) return;
        const usable = all.filter(
          (p) => p.enabled && p.api_key_count > 0,
        );
        setProviders(usable);
        setSelectedProviderId((prev) =>
          prev || (usable.length > 0 ? usable[0].id : ""),
        );
      })
      .catch((loadError) => {
        console.warn("[UI Agent] 拉取模型 Provider 列表失败：", loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 切换设备时重置会话
  useEffect(() => {
    setSteps([]);
    setRunning(false);
    setError(null);
    setFinalMessage(null);
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    taskIdRef.current = null;
  }, [device?.id]);

  // 卸载时清理监听
  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  const handleEvent = useCallback((event: UiAgentEvent) => {
    options?.onUiAgentEvent?.(event);
    if (event.type === "done") {
      setRunning(false);
      setFinalMessage(event.finalMessage);
      if (!event.success) {
        setError(event.finalMessage || "任务未成功完成");
      }
      return;
    }
    if (event.type === "error") {
      setRunning(false);
      setError(event.message);
      return;
    }
    if (event.type === "exit") {
      setRunning((prev) => {
        if (prev) {
          setError(`UI Agent 进程异常退出（code=${event.code}）`);
        }
        return false;
      });
      return;
    }
    setSteps((prev) => projectEvent(prev, event));
  }, [options?.onUiAgentEvent]);

  const submitInstruction = useCallback(
    async (instruction: string) => {
      const trimmed = instruction.trim();
      if (!trimmed || !device || running) {
        return;
      }
      setSteps([]);
      setError(null);
      setFinalMessage(null);
      setRunning(true);

      const taskId = createTaskId();
      taskIdRef.current = taskId;

      try {
        // 先订阅事件再启动，避免漏事件
        const unlisten = await listenUiAgentEvents(taskId, handleEvent);
        unlistenRef.current = unlisten;

        await startUiAgent({
          taskId,
          deviceId: device.id,
          serial: device.serial,
          instruction: trimmed,
          providerId: selectedProviderId || undefined,
          model: model.trim() || DEFAULT_MODEL,
          maxSteps: DEFAULT_MAX_STEPS,
        });
      } catch (startError) {
        setRunning(false);
        setError(
          startError instanceof Error
            ? startError.message
            : "启动 UI Agent 失败",
        );
        if (unlistenRef.current) {
          unlistenRef.current();
          unlistenRef.current = null;
        }
      }
    },
    [device, running, selectedProviderId, model, handleEvent],
  );

  const cancelTask = useCallback(async () => {
    const taskId = taskIdRef.current;
    if (!taskId) {
      setRunning(false);
      return;
    }
    try {
      await cancelUiAgent(taskId);
    } catch (cancelError) {
      console.warn("[UI Agent] 取消任务失败：", cancelError);
    } finally {
      setRunning(false);
    }
  }, []);

  const genieUnavailable =
    !device || device.platform !== "android" || device.status !== "online";

  return {
    sidecar: null,
    steps,
    running,
    error,
    finalMessage,
    aiReady: providers.length > 0,
    genieUnavailable,
    submitInstruction,
    cancelTask,
    providers,
    selectedProviderId,
    setSelectedProviderId,
    model,
    setModel,
  };
}
