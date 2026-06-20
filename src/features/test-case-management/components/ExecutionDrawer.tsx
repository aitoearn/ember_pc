/**
 * 用例执行抽屉（US3）。
 *
 * 右侧滑出：选目标设备 + 模型 → 用 buildInstruction 把用例转自然语言指令 →
 * 经 UI Agent（ui_agent_start）驱动真机执行，实时展示逐步 thought/action/截图 →
 * 结束后用 executionReducer 派生判定结果，落库 testCaseRun 并回写用例执行结果，
 * 同时刷新历史执行时间线。事件折叠与结果派生全部走纯函数 executionReducer。
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, Play, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  apiKeyProviderApi,
  type ProviderWithKeysDisplay,
} from "@/lib/api/apiKeyProvider";
import { listDeviceAutomationDevices } from "@/lib/api/deviceAutomation";
import {
  cancelUiAgent,
  listenUiAgentEvents,
  startUiAgent,
} from "@/lib/api/uiAgent";
import { projectAgentDevices } from "@/features/device-automation/domain/deviceProjection";
import { isOemManagedHubProvider } from "@/lib/oemEmberHubProvider";
import type { DeviceAutomationCardModel } from "@/features/device-automation/types";
import type { UiAgentEvent } from "@/features/device-automation/events";
import { listTestCaseRuns, saveTestCaseRun } from "../api";
import { buildInstruction } from "../viewModel/buildInstruction";
import {
  buildRunRecord,
  initialExecutionState,
  isTerminal,
  reduceExecutionEvent,
  type ExecutionState,
} from "../viewModel/executionReducer";
import type { TestCase, TestCaseRun, TestCaseRunResult } from "../types";

const DEFAULT_MODEL = "qwen3.7-plus";
const DEFAULT_MAX_STEPS = 20;

type RootAction = { kind: "event"; event: UiAgentEvent } | { kind: "reset" };

function rootReducer(state: ExecutionState, action: RootAction): ExecutionState {
  if (action.kind === "reset") {
    return initialExecutionState;
  }
  return reduceExecutionEvent(state, action.event);
}

function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tc-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface ExecutionDrawerProps {
  open: boolean;
  workspaceId: string;
  testCase: TestCase | null;
  onClose: () => void;
  /** 执行落库后回调，供页面回写用例执行结果。 */
  onRunComplete?: (run: TestCaseRun, result: TestCaseRunResult) => void;
}

export function ExecutionDrawer({
  open,
  workspaceId,
  testCase,
  onClose,
  onRunComplete,
}: ExecutionDrawerProps) {
  const { t } = useTranslation("testCaseManagement");
  const [state, dispatch] = useReducer(rootReducer, initialExecutionState);
  const [devices, setDevices] = useState<DeviceAutomationCardModel[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [providers, setProviders] = useState<ProviderWithKeysDisplay[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<TestCaseRun[]>([]);

  const unlistenRef = useRef<(() => void) | null>(null);
  const persistedRef = useRef(false);
  const metaRef = useRef<{
    taskId: string;
    deviceId: string;
    instruction: string;
    startedAt: string;
  } | null>(null);

  const caseId = testCase?.id ?? "";

  const refreshHistory = useCallback(async () => {
    if (!workspaceId || !caseId) {
      return;
    }
    try {
      const runs = await listTestCaseRuns(workspaceId, caseId);
      setHistory(runs);
    } catch (loadError) {
      console.warn("[用例执行] 加载历史执行记录失败：", loadError);
    }
  }, [workspaceId, caseId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    dispatch({ kind: "reset" });
    persistedRef.current = false;
    metaRef.current = null;
    setRunning(false);
    setError("");
    void refreshHistory();

    let cancelled = false;
    void listDeviceAutomationDevices()
      .then((response) => {
        if (cancelled) return;
        const projected = projectAgentDevices(response.devices ?? []);
        setDevices(projected);
        setSelectedDeviceId((prev) => {
          if (prev && projected.some((d) => d.id === prev)) {
            return prev;
          }
          const online = projected.find((d) => d.status === "online");
          return online?.id ?? projected[0]?.id ?? "";
        });
      })
      .catch((loadError) => {
        console.warn("[用例执行] 加载设备列表失败：", loadError);
      });
    void apiKeyProviderApi
      .getProviders()
      .then((all) => {
        if (cancelled) return;
        const usable = all.filter(
          (p) =>
            p.enabled &&
            p.api_key_count > 0 &&
            !isOemManagedHubProvider(p),
        );
        setProviders(usable);
        setSelectedProviderId((prev) =>
          prev || (usable.length > 0 ? usable[0].id : ""),
        );
      })
      .catch((loadError) => {
        console.warn("[用例执行] 加载模型 Provider 失败：", loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [open, caseId, refreshHistory]);

  useEffect(() => {
    return () => {
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isTerminal(state.status) || persistedRef.current) {
      return;
    }
    const meta = metaRef.current;
    if (!meta || !testCase) {
      return;
    }
    persistedRef.current = true;
    setRunning(false);
    unlistenRef.current?.();
    unlistenRef.current = null;

    const run = buildRunRecord({
      id: meta.taskId,
      caseId: testCase.id,
      deviceId: meta.deviceId,
      instruction: meta.instruction,
      startedAt: meta.startedAt,
      finishedAt: new Date().toISOString(),
      state,
    });
    void (async () => {
      try {
        const saved = await saveTestCaseRun(workspaceId, run);
        onRunComplete?.(saved, saved.result);
        await refreshHistory();
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : String(saveError),
        );
      }
    })();
  }, [state, testCase, workspaceId, onRunComplete, refreshHistory]);

  if (!open || !testCase) {
    return null;
  }

  const handleEvent = (event: UiAgentEvent) => {
    dispatch({ kind: "event", event });
  };

  const handleStart = async () => {
    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device) {
      setError(t("testCaseManagement.exec.noDevice"));
      return;
    }
    const instruction = buildInstruction(testCase);
    dispatch({ kind: "reset" });
    persistedRef.current = false;
    setError("");
    setRunning(true);

    const taskId = createTaskId();
    const startedAt = new Date().toISOString();
    metaRef.current = {
      taskId,
      deviceId: device.id,
      instruction,
      startedAt,
    };

    try {
      const unlisten = await listenUiAgentEvents(taskId, handleEvent);
      unlistenRef.current = unlisten;
      await startUiAgent({
        taskId,
        deviceId: device.id,
        serial: device.serial,
        instruction,
        providerId: selectedProviderId || undefined,
        model: model.trim() || DEFAULT_MODEL,
        maxSteps: DEFAULT_MAX_STEPS,
      });
    } catch (startError) {
      setRunning(false);
      persistedRef.current = true;
      setError(
        startError instanceof Error
          ? startError.message
          : t("testCaseManagement.exec.startFailed"),
      );
      unlistenRef.current?.();
      unlistenRef.current = null;
    }
  };

  const handleCancel = async () => {
    const meta = metaRef.current;
    if (!meta) {
      setRunning(false);
      return;
    }
    try {
      await cancelUiAgent(meta.taskId);
    } catch (cancelError) {
      console.warn("[用例执行] 取消任务失败：", cancelError);
    } finally {
      setRunning(false);
    }
  };

  const resultBadge = (result: TestCaseRunResult) => {
    const variant =
      result === "通过" ? "default" : result === "失败" ? "destructive" : "secondary";
    return <Badge variant={variant}>{result}</Badge>;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("testCaseManagement.action.close")}
        className="bg-foreground/20 absolute inset-0"
        onClick={onClose}
      />
      <div className="bg-background relative flex h-full w-full max-w-2xl flex-col border-l shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Play className="text-primary h-4 w-4" />
            {t("testCaseManagement.exec.title", { title: testCase.title })}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("testCaseManagement.exec.device")}</Label>
              <Select
                value={selectedDeviceId}
                onValueChange={setSelectedDeviceId}
                disabled={running}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("testCaseManagement.exec.devicePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name || device.serial}（{device.status}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("testCaseManagement.exec.model")}</Label>
              <Select
                value={selectedProviderId}
                onValueChange={setSelectedProviderId}
                disabled={running}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("testCaseManagement.exec.modelPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <Label className="text-muted-foreground text-xs">
              {t("testCaseManagement.exec.instruction")}
            </Label>
            <pre className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
              {buildInstruction(testCase)}
            </pre>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {state.steps.length > 0 ? (
            <div className="space-y-2">
              <Label>{t("testCaseManagement.exec.progress")}</Label>
              {state.steps.map((step) => (
                <div key={step.stepNo} className="rounded-md border p-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {t("testCaseManagement.exec.stepNo", { no: step.stepNo })}
                    {typeof step.durationSec === "number" ? (
                      <span className="text-muted-foreground text-xs">
                        {t("testCaseManagement.exec.duration", {
                          sec: step.durationSec,
                        })}
                      </span>
                    ) : null}
                  </div>
                  {step.thought ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {step.thought}
                    </p>
                  ) : null}
                  {step.action ? (
                    <p className="mt-1 text-xs">{step.action}</p>
                  ) : null}
                  {step.screenshot ? (
                    <img
                      src={step.screenshot}
                      alt={t("testCaseManagement.exec.stepNo", {
                        no: step.stepNo,
                      })}
                      className="mt-2 max-h-48 rounded border"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {state.summary ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {state.summary}
            </div>
          ) : null}

          {history.length > 0 ? (
            <div className="space-y-2">
              <Label>{t("testCaseManagement.exec.history")}</Label>
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {resultBadge(run.result)}
                    <span className="text-muted-foreground text-xs">
                      {run.finishedAt || run.startedAt}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {t("testCaseManagement.exec.stepCount", {
                      count: run.steps.length,
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          {running ? (
            <Button variant="outline" onClick={handleCancel}>
              <Square className="mr-1 h-4 w-4" />
              {t("testCaseManagement.exec.cancel")}
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={!selectedDeviceId}>
              <Play className="mr-1 h-4 w-4" />
              {t("testCaseManagement.exec.start")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
