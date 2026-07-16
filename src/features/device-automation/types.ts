export type DeviceAutomationView = "list" | "debug";

export type DeviceAutomationPlatform = "android" | "ios" | "harmony";

export type DeviceAutomationStatus =
  | "online"
  | "offline"
  | "busy"
  | "automating"
  | "maintenance";

export interface AgentDeviceRecord {
  platform: string;
  id: string;
  name: string;
  kind: string;
  target?: string;
  booted?: boolean;
  /** adb / agent-device 补全：ro.product.brand */
  brand?: string;
  /** adb 补全：ro.product.manufacturer */
  manufacturer?: string;
  /** adb 补全：ro.product.model */
  model?: string;
  /** adb 补全：wm size，如 1080x2400 */
  resolution?: string;
  /** adb 补全：ro.build.version.release */
  platformVersion?: string;
}

export interface AgentDeviceListResponse {
  devices: AgentDeviceRecord[];
}

export interface DeviceAutomationRuntimeStatus {
  ready: boolean;
  backend: "agent-device";
  agentDeviceRoot?: string;
  agentDeviceStateDir?: string;
  error?: string;
}

/** @deprecated 兼容旧命名，请改用 DeviceAutomationRuntimeStatus */
export type DeviceAutomationSidecarStatus = DeviceAutomationRuntimeStatus;

export interface DeviceAutomationScreenshotResponse {
  base64: string;
  mediaType: string;
  capturedAt: string;
}

export interface DeviceAutomationScrcpyReverseTcpResponse {
  port?: number;
  local?: string;
  remote?: string;
  reused?: boolean;
}

export interface DeviceAutomationScrcpyStartResponse {
  deviceId?: string;
  pid?: number;
  remotePath?: string;
  scid?: string;
  version?: string;
}

export interface DeviceAutomationScrcpyConnectResponse {
  reverse: DeviceAutomationScrcpyReverseTcpResponse;
  start: DeviceAutomationScrcpyStartResponse;
}

export interface AutoGlmSidecarStatus {
  running: boolean;
  ready: boolean;
  baseUrl: string;
  port: number;
  pid?: number;
  error?: string;
  rootPath?: string;
}

export interface DeviceAutomationAiTaskRun {
  id: string;
  status: string;
  input_text: string;
  final_message?: string | null;
  error_message?: string | null;
  step_count: number;
}

export interface DeviceAutomationAiTaskEvent {
  task_id: string;
  seq: number;
  event_type: string;
  role: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DeviceAutomationAiSessionResponse {
  sidecar: AutoGlmSidecarStatus;
  session: {
    id: string;
    kind: string;
    mode: string;
    device_id: string;
    device_serial: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface DeviceAutomationAiPollResponse {
  task: DeviceAutomationAiTaskRun;
  events: DeviceAutomationAiTaskEvent[];
}

export interface DeviceAutomationGenieStep {
  index: number;
  desc: string;
  status: "completed" | "running" | "pending";
  thought?: string;
  action?: string;
  /** 步骤耗时（秒），完成时填充。 */
  duration?: number;
  /** 本步观察到的屏幕截图（data URL），observe 阶段填充。 */
  screenshot?: string;
}

export interface DeviceAutomationCardModel {
  id: string;
  serial: string;
  name: string;
  brand: string;
  model: string;
  system: string;
  resolution: string;
  group: string;
  space: string;
  status: DeviceAutomationStatus;
  platform: DeviceAutomationPlatform;
  /** agent-device CLI 使用的原始 platform 字段 */
  agentPlatform: string;
  connectionType: string;
}
