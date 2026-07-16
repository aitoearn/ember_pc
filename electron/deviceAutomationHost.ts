import { DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT } from "../src/features/device-automation/events";
import { DEVICE_AUTOMATION_MONKEY_EVENT } from "../src/features/device-automation/monkey/events";
import {
  DEVICE_AUTOMATION_PERF_FRAME_EVENT,
  DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT,
} from "../src/features/device-automation/performance/events";
import { DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT } from "../src/features/device-automation/stability/events";
import { DeviceInventoryWatcher } from "./deviceAutomation/deviceInventoryWatcher";
import type { MonkeyStartParams } from "./deviceAutomation/monkeyTest";
import type { PerfStartParams } from "./deviceAutomation/performanceMonitor";
import type {
  PerfTraceAnalyzeParams,
  PerfTraceStartParams,
} from "./deviceAutomation/perfTraceCapture";
import type { StabilityAnalysisStartParams } from "./deviceAutomation/stabilityAnalysis";
import { deviceAutomationRuntime } from "./deviceAutomationSidecar";
import type { StabilityLlmConfig } from "../src/features/device-automation/stability/types";

type HostArgs = Record<string, unknown> | null | undefined;
type HostEventEmitter = (event: string, payload?: unknown) => void;
import {
  DEVICE_AUTOMATION_COMMANDS,
  type DeviceAutomationCommand,
} from "./deviceAutomationCommands";

export type { DeviceAutomationCommand } from "./deviceAutomationCommands";
export { DEVICE_AUTOMATION_COMMANDS } from "./deviceAutomationCommands";
const deviceAutomationCommandSet = new Set<string>(DEVICE_AUTOMATION_COMMANDS);

export function isDeviceAutomationCommand(
  command: string,
): command is DeviceAutomationCommand {
  return deviceAutomationCommandSet.has(command);
}

export class ElectronDeviceAutomationHost {
  async invoke(
    command: string,
    args?: HostArgs,
  ): Promise<unknown> {
    const request = readRequest(args);
    switch (command) {
      case "device_automation_ensure_sidecar":
        return await deviceAutomationRuntime.ensure(
          readOptionalWarmDevice(request),
        );
      case "device_automation_get_sidecar_status":
        return await deviceAutomationRuntime.ensure();
      case "device_automation_list_devices":
        return await deviceAutomationRuntime.listDevices({
          force: readOptionalBoolean(request, "force"),
        });
      case "device_automation_capture_screenshot":
        return await deviceAutomationRuntime.captureScreenshot({
          platform: readRequiredString(request, "platform"),
          deviceId: readRequiredString(request, "deviceId"),
        });
      case "device_automation_send_navigation":
        return await deviceAutomationRuntime.sendNavigation({
          action: readNavigationAction(request),
          platform: readRequiredString(request, "platform"),
          deviceId: readRequiredString(request, "deviceId"),
        });
      case "device_automation_send_tap":
        return await deviceAutomationRuntime.sendTap({
          platform: readRequiredString(request, "platform"),
          deviceId: readRequiredString(request, "deviceId"),
          x: readRequiredNumber(request, "x"),
          y: readRequiredNumber(request, "y"),
        });
      case "device_automation_send_swipe":
        return await deviceAutomationRuntime.sendSwipe({
          platform: readRequiredString(request, "platform"),
          deviceId: readRequiredString(request, "deviceId"),
          x1: readRequiredNumber(request, "x1"),
          y1: readRequiredNumber(request, "y1"),
          x2: readRequiredNumber(request, "x2"),
          y2: readRequiredNumber(request, "y2"),
        });
      case "device_automation_ensure_ai_sidecar":
        return await deviceAutomationRuntime.ensureAiSidecar();
      case "device_automation_prepare_ai_session":
        return await deviceAutomationRuntime.prepareAiSession({
          deviceId: readRequiredString(request, "deviceId"),
          deviceSerial: readRequiredString(request, "deviceSerial"),
          mode: readOptionalAiSessionMode(request),
        });
      case "device_automation_submit_ai_task":
        return await deviceAutomationRuntime.submitAiTask({
          sessionId: readRequiredString(request, "sessionId"),
          message: readRequiredString(request, "message"),
        });
      case "device_automation_poll_ai_task":
        return await deviceAutomationRuntime.pollAiTask({
          taskId: readRequiredString(request, "taskId"),
          afterSeq: readOptionalNumber(request, "afterSeq"),
        });
      case "device_automation_cancel_ai_task":
        return await deviceAutomationRuntime.cancelAiTask(
          readRequiredString(request, "taskId"),
        );
      case "device_automation_scrcpy_prepare_reverse":
        return await deviceAutomationRuntime.prepareScrcpyReverse({
          deviceId: readRequiredString(request, "deviceId"),
          remote: readRequiredString(request, "remote"),
        });
      case "device_automation_scrcpy_reverse_tcp":
        return await deviceAutomationRuntime.reverseScrcpyTcp({
          deviceId: readRequiredString(request, "deviceId"),
          remote: readRequiredString(request, "remote"),
          localPort: readRequiredNumber(request, "localPort"),
        });
      case "device_automation_scrcpy_start":
        return await deviceAutomationRuntime.startScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
          scid: readRequiredString(request, "scid"),
          maxSize: readOptionalNumber(request, "maxSize"),
          videoBitRate: readOptionalNumber(request, "videoBitRate"),
          audio: readOptionalBoolean(request, "audio"),
        });
      case "device_automation_scrcpy_stop":
        return deviceAutomationRuntime.stopScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
        });
      case "device_automation_scrcpy_teardown":
        return deviceAutomationRuntime.teardownScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
          remote: readRequiredString(request, "remote"),
          killServer: readOptionalBoolean(request, "killServer"),
        });
      case "device_automation_scrcpy_launch":
        return await deviceAutomationRuntime.launchScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
          remote: readRequiredString(request, "remote"),
          localPort: readRequiredNumber(request, "localPort"),
          scid: readRequiredString(request, "scid"),
          maxSize: readOptionalNumber(request, "maxSize"),
          videoBitRate: readOptionalNumber(request, "videoBitRate"),
          audio: readOptionalBoolean(request, "audio"),
        });
      case "device_automation_scrcpy_prewarm":
        return deviceAutomationRuntime.prewarmScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
        });
      case "device_automation_scrcpy_connect":
        return await deviceAutomationRuntime.connectScrcpy({
          deviceId: readRequiredString(request, "deviceId"),
          remote: readRequiredString(request, "remote"),
          localPort: readRequiredNumber(request, "localPort"),
          scid: readRequiredString(request, "scid"),
          maxSize: readOptionalNumber(request, "maxSize"),
          videoBitRate: readOptionalNumber(request, "videoBitRate"),
          audio: readOptionalBoolean(request, "audio"),
        });
      case "device_automation_monkey_start":
        return deviceAutomationRuntime.startMonkeyTest(
          request as MonkeyStartParams,
        );
      case "device_automation_monkey_stop":
        return deviceAutomationRuntime.stopMonkeyTest({
          sessionId: readRequiredString(request, "sessionId"),
        });
      case "device_automation_monkey_get_status":
        return deviceAutomationRuntime.getMonkeyStatus();
      case "device_automation_kea2_get_tool_status":
        return deviceAutomationRuntime.getKea2ToolStatus();
      case "device_automation_stability_analysis_get_tool_status":
        return deviceAutomationRuntime.getStabilityAnalysisToolStatus();
      case "device_automation_stability_analysis_start":
        return deviceAutomationRuntime.startStabilityAnalysis(
          request as StabilityAnalysisStartParams,
        );
      case "device_automation_stability_analysis_cancel":
        return deviceAutomationRuntime.cancelStabilityAnalysis({
          runId: readRequiredString(request, "runId"),
        });
      case "device_automation_stability_analysis_get_status":
        return deviceAutomationRuntime.getStabilityAnalysisStatus();
      case "device_automation_stability_llm_config_read":
        return deviceAutomationRuntime.readStabilityLlmConfig();
      case "device_automation_stability_llm_config_save":
        return deviceAutomationRuntime.saveStabilityLlmConfig(
          request as StabilityLlmConfig,
        );
      case "device_automation_perf_list_apps":
        return deviceAutomationRuntime.listPerfApps({
          platform: readRequiredString(request, "platform"),
          deviceId: readRequiredString(request, "deviceId"),
        });
      case "device_automation_perf_start":
        return deviceAutomationRuntime.startPerfCollection(
          request as PerfStartParams,
        );
      case "device_automation_perf_stop":
        return deviceAutomationRuntime.stopPerfCollection({
          sessionId: readRequiredString(request, "sessionId"),
        });
      case "device_automation_perf_get_status":
        return deviceAutomationRuntime.getPerfStatus();
      case "device_automation_perf_trace_start":
        return deviceAutomationRuntime.startPerfTraceCapture(
          request as PerfTraceStartParams,
        );
      case "device_automation_perf_trace_stop":
        return deviceAutomationRuntime.stopPerfTraceCapture({
          captureId: readRequiredString(request, "captureId"),
        });
      case "device_automation_perf_trace_cancel":
        return deviceAutomationRuntime.cancelPerfTraceCapture({
          captureId: readRequiredString(request, "captureId"),
        });
      case "device_automation_perf_trace_get_status":
        return deviceAutomationRuntime.getPerfTraceCaptureStatus();
      case "device_automation_perf_trace_analyze":
        return deviceAutomationRuntime.analyzePerfTrace(
          request as PerfTraceAnalyzeParams,
        );
      case "device_automation_perf_trace_open_external":
        return deviceAutomationRuntime.openPerfTraceExternal({
          localPath: readRequiredString(request, "localPath"),
          target: readPerfTraceOpenTarget(request),
        });
      case "device_automation_perf_trace_delete_local":
        return deviceAutomationRuntime.deletePerfTraceLocalFile({
          localPath: readRequiredString(request, "localPath"),
        });
      default: {
        const unsupported: never = command as never;
        throw new Error(
          `Electron device automation command is not implemented: ${unsupported}`,
        );
      }
    }
  }
}

export type DeviceAutomationHostBootstrap = {
  dispose: () => void;
};

export function bootstrapDeviceAutomationHost(
  emit: HostEventEmitter,
): DeviceAutomationHostBootstrap {
  const watcher = new DeviceInventoryWatcher({
    emit,
    onInitialSnapshot: () => {
      void deviceAutomationRuntime
        .listDevices({ force: true })
        .catch((error) => {
          console.warn("[device-automation] 预热设备列表失败", error);
        });
    },
  });
  watcher.start();
  deviceAutomationRuntime.setAndroidDeviceProvider(() =>
    watcher.getAndroidDevices(),
  );
  deviceAutomationRuntime.setInventoryChangeEmitter((payload) => {
    emit(DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT, payload);
  });
  deviceAutomationRuntime.setPerfFrameEmitter((payload) => {
    emit(DEVICE_AUTOMATION_PERF_FRAME_EVENT, payload);
  });
  deviceAutomationRuntime.setMonkeyEventEmitter((payload) => {
    emit(DEVICE_AUTOMATION_MONKEY_EVENT, payload);
  });
  deviceAutomationRuntime.setStabilityAnalysisEventEmitter((payload) => {
    emit(DEVICE_AUTOMATION_STABILITY_ANALYSIS_EVENT, payload);
  });
  deviceAutomationRuntime.setPerfTraceProgressEmitter((payload) => {
    emit(DEVICE_AUTOMATION_PERF_TRACE_PROGRESS_EVENT, payload);
  });

  return {
    dispose: () => {
      watcher.stop();
      deviceAutomationRuntime.setAndroidDeviceProvider(null);
      deviceAutomationRuntime.setInventoryChangeEmitter(null);
      deviceAutomationRuntime.setPerfFrameEmitter(null);
      deviceAutomationRuntime.setMonkeyEventEmitter(null);
      deviceAutomationRuntime.setStabilityAnalysisEventEmitter(null);
      deviceAutomationRuntime.setPerfTraceProgressEmitter(null);
      void deviceAutomationRuntime.stop();
    },
  };
}

function readRequest(args?: HostArgs): Record<string, unknown> {
  if (!args || typeof args !== "object") {
    return {};
  }
  return args;
}

function readOptionalWarmDevice(
  request: Record<string, unknown>,
): { warmDevice?: { platform: string; deviceId: string } } | undefined {
  const warmDevice = request.warmDevice;
  if (!warmDevice || typeof warmDevice !== "object") {
    return undefined;
  }
  const platform =
    "platform" in warmDevice ? String(warmDevice.platform ?? "") : "";
  const deviceId =
    "deviceId" in warmDevice ? String(warmDevice.deviceId ?? "") : "";
  if (!platform || !deviceId) {
    return undefined;
  }
  return { warmDevice: { platform, deviceId } };
}

function readNavigationAction(
  request: Record<string, unknown>,
): "back" | "home" {
  const action = readRequiredString(request, "action");
  if (action === "back" || action === "home") {
    return action;
  }
  throw new Error(`device_automation_send_navigation.action 无效: ${action}`);
}

function readOptionalAiSessionMode(
  request: Record<string, unknown>,
): "classic" | "layered" | undefined {
  const mode = request.mode;
  if (mode === "classic" || mode === "layered") {
    return mode;
  }
  return undefined;
}

function readPerfTraceOpenTarget(
  request: Record<string, unknown>,
): "perfetto_ui" {
  const target = readRequiredString(request, "target");
  if (target === "perfetto_ui") {
    return target;
  }
  throw new Error(
    `device_automation_perf_trace_open_external.target 无效: ${target}`,
  );
}

function readRequiredString(
  request: Record<string, unknown>,
  key: string,
): string {
  const value = request[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少或无效参数 "${key}"`);
  }
  return value;
}

function readRequiredNumber(
  request: Record<string, unknown>,
  key: string,
): number {
  const value = request[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`缺少或无效参数 "${key}"`);
  }
  return value;
}

function readOptionalNumber(
  request: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = request[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`无效参数 "${key}"`);
  }
  return value;
}

function readOptionalBoolean(
  request: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = request[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`无效参数 "${key}"`);
  }
  return value;
}
