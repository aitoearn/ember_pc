/**
 * 确定性流回放 hook：订阅回放事件、投影状态、落库 FlowRun。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelDeviceFlowReplay,
  listenDeviceFlowReplayEvents,
  startDeviceFlowReplay,
} from "@/lib/api/deviceFlow";
import {
  saveDeviceFlowHealing,
  saveDeviceFlowRun,
} from "../api";
import type { DeviceFlowReplayEvent } from "../../events";
import type { LocatorKind } from "../domain/flowFormat";
import type {
  FlowRun,
  FlowRunStep,
  HealingRevision,
  TestFlow,
} from "../domain/flowFormat";
import {
  initialReplayState,
  reduceReplayEvent,
  type ReplayState,
} from "../domain/replayProjection";

function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `flow-run-${Date.now()}`;
}

function createHealingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `healing-${Date.now()}`;
}

export interface UseFlowReplayOptions {
  workspaceId: string;
  deviceId: string;
  serial: string;
  selfHealingEnabled: boolean;
  providerId?: string;
  model?: string;
}

export function useFlowReplay(options: UseFlowReplayOptions) {
  const [state, setState] = useState<ReplayState>(initialReplayState);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistedRunId, setPersistedRunId] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const pendingHealingRef = useRef<HealingRevision[]>([]);
  const activeFlowRef = useRef<TestFlow | null>(null);

  const cleanupListen = useCallback(() => {
    unlistenRef.current?.();
    unlistenRef.current = null;
  }, []);

  const handleReplayEvent = useCallback((event: DeviceFlowReplayEvent) => {
    setState((prev) => reduceReplayEvent(prev, event));

    if (event.type === "healed" && activeFlowRef.current) {
      const flow = activeFlowRef.current;
      const step = flow.steps.find((s) => s.index === event.index);
      pendingHealingRef.current.push({
        id: createHealingId(),
        flowId: flow.id,
        stepIndex: event.index,
        runId: event.runId,
        originalLocators: step?.locators ?? [],
        healedLocator: event.healedLocator,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    if (event.type === "done" || event.type === "error") {
      setRunning(false);
    }
  }, []);

  const startReplay = useCallback(
    async (flow: TestFlow) => {
      if (!options.workspaceId || !options.deviceId) {
        setError("工作区或设备未就绪");
        return null;
      }
      if (flow.platform !== "android") {
        setError("unsupported_platform");
        return null;
      }
      cleanupListen();
      setState(initialReplayState);
      setError(null);
      setRunning(true);
      setPersistedRunId(null);
      pendingHealingRef.current = [];
      activeFlowRef.current = flow;

      const runId = createRunId();
      runIdRef.current = runId;

      try {
        const unlisten = await listenDeviceFlowReplayEvents(runId, handleReplayEvent);
        unlistenRef.current = unlisten;

        await startDeviceFlowReplay({
          runId,
          flowId: flow.id,
          deviceId: options.deviceId,
          serial: options.serial,
          flow,
          selfHealingEnabled: options.selfHealingEnabled,
          providerId: options.providerId,
          model: options.model,
        });
        return runId;
      } catch (startError) {
        setRunning(false);
        cleanupListen();
        setError(
          startError instanceof Error ? startError.message : String(startError),
        );
        return null;
      }
    },
    [cleanupListen, handleReplayEvent, options],
  );

  const cancelReplay = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) {
      return;
    }
    await cancelDeviceFlowReplay(runId);
    setRunning(false);
    cleanupListen();
  }, [cleanupListen]);

  const persistRun = useCallback(async (): Promise<string | null> => {
    const flow = activeFlowRef.current;
    const runId = runIdRef.current;
    if (!flow || !runId || state.status !== "done" || !state.conclusion) {
      return null;
    }
    if (persistedRunId === runId) {
      return persistedRunId;
    }
    const now = new Date().toISOString();
    const run: FlowRun = {
      id: runId,
      flowId: flow.id,
      workspaceId: options.workspaceId,
      deviceId: options.deviceId,
      startedAt: now,
      finishedAt: now,
      conclusion: state.conclusion,
      healingTriggered: state.healingTriggered,
      llmTokenUsed: state.llmTokenUsed,
      summary: state.summary,
    };
    const steps: FlowRunStep[] = state.steps.map((view) => {
      const locatorKind = view.healedLocator?.kind ??
        (view.locatorKind as LocatorKind | undefined);
      return {
        runId,
        index: view.index,
        op: view.op,
        locatorUsed: locatorKind
          ? {
              kind: locatorKind,
              value: view.healedLocator?.value ?? "",
            }
          : undefined,
        status:
          view.status === "pending" || view.status === "running"
            ? "blocked"
            : view.status,
        assertResult:
          view.assertOk !== undefined
            ? { ok: view.assertOk, reason: view.assertReason }
            : undefined,
        durationMs: view.durationMs ?? 0,
      };
    });

    const savedRunId = await saveDeviceFlowRun(run, steps);

    for (const revision of pendingHealingRef.current) {
      await saveDeviceFlowHealing({ ...revision, runId: savedRunId });
    }
    pendingHealingRef.current = [];
    setPersistedRunId(savedRunId);

    return savedRunId;
  }, [options.deviceId, options.workspaceId, persistedRunId, state]);

  useEffect(() => {
    if (state.status === "done" && state.conclusion) {
      void persistRun();
    }
  }, [persistRun, state.conclusion, state.status]);

  return {
    state,
    running,
    error,
    startReplay,
    cancelReplay,
    persistRun,
    persistedRunId,
    pendingHealingCount: pendingHealingRef.current.length,
  };
}
