/**
 * 流录制 hook：聚合 VLM 事件投影或 Host 手动录制，产出 FlowStep 草稿。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startManualFlowRecord,
  stopManualFlowRecord,
} from "@/lib/api/deviceFlow";
import type { UiAgentEvent } from "../../events";
import type { DeviceAutomationCardModel } from "../../types";
import type { FlowStep, FlowSource, TestFlow } from "../domain/flowFormat";
import {
  CURRENT_FLOW_FORMAT_VERSION,
  inferAppPackageFromFlowSteps,
} from "../domain/flowFormat";
import { saveDeviceFlow } from "../api";
import {
  initialRecordingProjectionState,
  reduceRecordingProjectionEvent,
  recordingProjectionStateToFlowSteps,
  type RecordingProjectionOptions,
} from "../domain/recordingProjection";
import {
  buildManualTapStep,
  buildManualSwipeStep,
  mapMirrorNavigationToFlowOp,
  mergeFlowStepDrafts,
} from "../domain/manualRecordingProjection";

export type FlowRecorderMode = "idle" | "vlm" | "manual";

function createRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `flow-record-${Date.now()}`;
}

function createFlowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `flow-${Date.now()}`;
}

export interface UseFlowRecorderOptions {
  device: DeviceAutomationCardModel | null;
  workspaceId: string;
  /** 默认目标应用包名（launch_app / 落库 appPackage）。 */
  appPackage?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export function useFlowRecorder(options: UseFlowRecorderOptions) {
  const { device, workspaceId, appPackage = "", screenWidth, screenHeight } =
    options;

  const [mode, setMode] = useState<FlowRecorderMode>("idle");
  const [draftSteps, setDraftSteps] = useState<FlowStep[]>([]);
  const [draftSource, setDraftSource] = useState<FlowSource>("vlm_recorded");
  const [error, setError] = useState<string | null>(null);

  const vlmProjectionRef = useRef(
    initialRecordingProjectionState({
      appPackage,
      screenWidth,
      screenHeight,
    }),
  );
  const manualRecordIdRef = useRef<string | null>(null);
  const scrcpyLocalStepsRef = useRef<FlowStep[]>([]);
  const modeRef = useRef<FlowRecorderMode>("idle");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const projectionOptions: RecordingProjectionOptions = {
    appPackage,
    screenWidth,
    screenHeight,
  };

  const resetDraft = useCallback(() => {
    setDraftSteps([]);
    setError(null);
    vlmProjectionRef.current = initialRecordingProjectionState(projectionOptions);
    scrcpyLocalStepsRef.current = [];
  }, [appPackage, screenHeight, screenWidth]);

  const beginVlmCapture = useCallback(() => {
    resetDraft();
    setDraftSource("vlm_recorded");
    setMode("vlm");
    vlmProjectionRef.current = initialRecordingProjectionState(projectionOptions);
  }, [projectionOptions, resetDraft]);

  const ingestUiAgentEvent = useCallback((event: UiAgentEvent) => {
    if (modeRef.current !== "vlm") {
      return;
    }
    vlmProjectionRef.current = reduceRecordingProjectionEvent(
      vlmProjectionRef.current,
      event,
    );
  }, []);

  const finalizeVlmCapture = useCallback(() => {
    const steps = recordingProjectionStateToFlowSteps(vlmProjectionRef.current);
    setDraftSteps(steps);
    setMode("idle");
  }, []);

  const startManualCapture = useCallback(async () => {
    if (!device || device.platform !== "android" || device.status !== "online") {
      setError("手动录制仅支持在线 Android 设备");
      return false;
    }
    resetDraft();
    setDraftSource("manual_recorded");
    const recordId = createRecordId();
    try {
      await startManualFlowRecord({
        recordId,
        deviceId: device.id,
        serial: device.serial ?? device.id,
        screenWidth,
        screenHeight,
      });
      manualRecordIdRef.current = recordId;
      scrcpyLocalStepsRef.current = [];
      setMode("manual");
      setError(null);
      return true;
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : String(startError),
      );
      return false;
    }
  }, [device, resetDraft, screenHeight, screenWidth]);

  const stopManualCapture = useCallback(async () => {
    const recordId = manualRecordIdRef.current;
    if (!recordId) {
      setMode("idle");
      return;
    }
    try {
      const hostResult = await stopManualFlowRecord({ recordId });
      const merged = mergeFlowStepDrafts(
        scrcpyLocalStepsRef.current,
        hostResult.steps,
      );
      setDraftSteps(merged);
      manualRecordIdRef.current = null;
      scrcpyLocalStepsRef.current = [];
      setMode("idle");
      setError(null);
    } catch (stopError) {
      setError(
        stopError instanceof Error ? stopError.message : String(stopError),
      );
    }
  }, []);

  /** scrcpy 直连触控路径：在渲染层补录步骤（与 Host send_tap 路径互补）。 */
  const recordMirrorTap = useCallback(
    (x: number, y: number) => {
      if (mode !== "manual") {
        return;
      }
      scrcpyLocalStepsRef.current.push(
        buildManualTapStep(scrcpyLocalStepsRef.current.length, x, y, {
          width: screenWidth,
          height: screenHeight,
        }),
      );
    },
    [mode, screenHeight, screenWidth],
  );

  const recordMirrorSwipe = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (mode !== "manual") {
        return;
      }
      scrcpyLocalStepsRef.current.push(
        buildManualSwipeStep(
          scrcpyLocalStepsRef.current.length,
          x1,
          y1,
          x2,
          y2,
          { width: screenWidth, height: screenHeight },
        ),
      );
    },
    [mode, screenHeight, screenWidth],
  );

  const recordMirrorNavigation = useCallback(
    (action: "back" | "home") => {
      if (mode !== "manual") {
        return;
      }
      const op = mapMirrorNavigationToFlowOp(action);
      if (!op) {
        return;
      }
      scrcpyLocalStepsRef.current.push({
        index: scrcpyLocalStepsRef.current.length,
        op,
      });
    },
    [mode],
  );

  const saveDraftAsFlow = useCallback(
    async (name: string, packageName?: string) => {
      if (!workspaceId) {
        throw new Error("工作区未就绪，无法保存测试流");
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("流名称不能为空");
      }
      const pkg = (
        packageName ??
        appPackage ??
        inferAppPackageFromFlowSteps(draftSteps)
      ).trim();
      if (!pkg) {
        throw new Error("目标应用包名不能为空");
      }
      const now = new Date().toISOString();
      const flow: TestFlow = {
        id: createFlowId(),
        workspaceId,
        name: trimmedName,
        appPackage: pkg,
        platform: "android",
        formatVersion: CURRENT_FLOW_FORMAT_VERSION,
        source: draftSource,
        selfHealingEnabled: true,
        steps: draftSteps,
        createdAt: now,
        updatedAt: now,
      };
      const saved = await saveDeviceFlow(flow);
      resetDraft();
      return saved;
    },
    [appPackage, draftSource, draftSteps, resetDraft, workspaceId],
  );

  return {
    mode,
    draftSteps,
    draftSource,
    error,
    beginVlmCapture,
    ingestUiAgentEvent,
    finalizeVlmCapture,
    startManualCapture,
    stopManualCapture,
    recordMirrorTap,
    recordMirrorSwipe,
    recordMirrorNavigation,
    saveDraftAsFlow,
    resetDraft,
  };
}
