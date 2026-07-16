/**
 * 手动投屏录制运行时：在 Host 侧记录经 device_automation_send_* 下发的触控/导航，
 * stop 时返回 FlowStep[] 草稿（source=manual_recorded 由渲染层落库时填写）。
 */

import type { FlowStep } from "../../src/features/device-automation/flow/domain/flowFormat";
import { deviceActivityLock } from "./deviceActivityLock";
import {
  buildManualBackStep,
  buildManualSwipeStep,
  buildManualTapStep,
  mapMirrorNavigationToFlowOp,
  reindexFlowSteps,
} from "../../src/features/device-automation/flow/domain/manualRecordingProjection";

export interface ManualFlowRecordStartParams {
  recordId: string;
  deviceId: string;
  serial: string;
  screenWidth?: number;
  screenHeight?: number;
}

interface ManualRecordSession {
  recordId: string;
  deviceId: string;
  serial: string;
  screenWidth?: number;
  screenHeight?: number;
  steps: FlowStep[];
}

class DeviceFlowRecordRuntime {
  readonly #sessions = new Map<string, ManualRecordSession>();
  readonly #deviceToRecordId = new Map<string, string>();

  start(params: ManualFlowRecordStartParams): { recordId: string } {
    const recordId = params.recordId?.trim();
    if (!recordId) {
      throw new Error("device_flow_record_manual_start 需要 recordId");
    }
    const deviceId = params.deviceId?.trim();
    if (!deviceId) {
      throw new Error("device_flow_record_manual_start 需要 deviceId");
    }
    if (this.#sessions.has(recordId)) {
      throw new Error(`手动录制会话已存在：${recordId}`);
    }
    const lock = deviceActivityLock.tryAcquire(deviceId, "flow_record", recordId);
    if (!lock.ok) {
      throw new Error(lock.message);
    }
    const activeOnDevice = this.#deviceToRecordId.get(deviceId);
    if (activeOnDevice) {
      deviceActivityLock.release(deviceId, recordId);
      throw new Error(`设备 ${deviceId} 已有进行中的手动录制：${activeOnDevice}`);
    }

    this.#sessions.set(recordId, {
      recordId,
      deviceId,
      serial: params.serial?.trim() ?? "",
      screenWidth: params.screenWidth,
      screenHeight: params.screenHeight,
      steps: [],
    });
    this.#deviceToRecordId.set(deviceId, recordId);
    return { recordId };
  }

  stop(params: { recordId: string }): { steps: FlowStep[] } {
    const recordId = params.recordId?.trim();
    if (!recordId) {
      throw new Error("device_flow_record_manual_stop 需要 recordId");
    }
    const session = this.#sessions.get(recordId);
    if (!session) {
      throw new Error(`未找到手动录制会话：${recordId}`);
    }
    this.#sessions.delete(recordId);
    this.#deviceToRecordId.delete(session.deviceId);
    deviceActivityLock.release(session.deviceId, recordId);
    return { steps: reindexFlowSteps(session.steps) };
  }

  isRecordingDevice(deviceId: string): boolean {
    return this.#deviceToRecordId.has(deviceId);
  }

  recordTapIfActive(params: {
    deviceId: string;
    x: number;
    y: number;
  }): void {
    const session = this.#sessionForDevice(params.deviceId);
    if (!session) {
      return;
    }
    session.steps.push(
      buildManualTapStep(session.steps.length, params.x, params.y, {
        width: session.screenWidth,
        height: session.screenHeight,
      }),
    );
  }

  recordSwipeIfActive(params: {
    deviceId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }): void {
    const session = this.#sessionForDevice(params.deviceId);
    if (!session) {
      return;
    }
    session.steps.push(
      buildManualSwipeStep(
        session.steps.length,
        params.x1,
        params.y1,
        params.x2,
        params.y2,
        { width: session.screenWidth, height: session.screenHeight },
      ),
    );
  }

  recordNavigationIfActive(params: {
    deviceId: string;
    action: "back" | "home";
  }): void {
    const session = this.#sessionForDevice(params.deviceId);
    if (!session) {
      return;
    }
    const op = mapMirrorNavigationToFlowOp(params.action);
    if (!op) {
      return;
    }
    session.steps.push(buildManualBackStep(session.steps.length));
  }

  #sessionForDevice(deviceId: string): ManualRecordSession | null {
    const recordId = this.#deviceToRecordId.get(deviceId);
    if (!recordId) {
      return null;
    }
    return this.#sessions.get(recordId) ?? null;
  }
}

export const deviceFlowRecordRuntime = new DeviceFlowRecordRuntime();
