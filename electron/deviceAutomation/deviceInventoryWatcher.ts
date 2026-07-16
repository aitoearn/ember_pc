import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT } from "../../src/features/device-automation/events";
import type { AgentDeviceCliRecord } from "./agentDeviceCli";
import { resolveToolRoot } from "./resolveToolRoot";

const CHANGE_DEBOUNCE_MS = 2_000;
const RESTART_DELAY_MS = 2_000;

export type DeviceInventoryChangePayload = {
  source: "adb-track-devices";
  changedAt: string;
};

export type DeviceInventoryEventEmitter = (
  event: string,
  payload?: unknown,
) => void;

type DeviceState = {
  id: string;
  state: string;
};

type DeviceInventoryWatcherOptions = {
  emit: DeviceInventoryEventEmitter;
  env?: NodeJS.ProcessEnv;
  spawnProcess?: typeof spawn;
  debounceMs?: number;
  restartDelayMs?: number;
  /** adb 首次输出设备快照后回调，用于预热主进程设备列表缓存。 */
  onInitialSnapshot?: () => void;
};

export class DeviceInventoryWatcher {
  readonly #emit: DeviceInventoryEventEmitter;
  readonly #env: NodeJS.ProcessEnv;
  readonly #spawnProcess: typeof spawn;
  readonly #debounceMs: number;
  readonly #restartDelayMs: number;
  readonly #onInitialSnapshot?: () => void;
  #child: ChildProcessWithoutNullStreams | null = null;
  #buffer = "";
  #lastSnapshot = "";
  #devices: DeviceState[] = [];
  #initialized = false;
  #changeTimer: ReturnType<typeof setTimeout> | null = null;
  #restartTimer: ReturnType<typeof setTimeout> | null = null;
  #stopping = false;

  constructor(options: DeviceInventoryWatcherOptions) {
    this.#emit = options.emit;
    this.#env = options.env ?? process.env;
    this.#spawnProcess = options.spawnProcess ?? spawn;
    this.#debounceMs = options.debounceMs ?? CHANGE_DEBOUNCE_MS;
    this.#restartDelayMs = options.restartDelayMs ?? RESTART_DELAY_MS;
    this.#onInitialSnapshot = options.onInitialSnapshot;
  }

  start(): void {
    if (this.#child || this.#stopping) {
      return;
    }
    const adbPath = resolveAdbPath(this.#env);
    if (!adbPath) {
      console.warn("[device-automation] 未找到 adb，跳过设备变化监听。");
      return;
    }
    this.#child = this.#spawnProcess(adbPath, ["track-devices"], {
      env: this.#env,
    });
    this.#child.stdout.on("data", (chunk) => {
      this.#buffer += String(chunk);
      this.#drainBuffer();
    });
    this.#child.stderr.on("data", (chunk) => {
      const message = String(chunk).trim();
      if (message) {
        console.warn(`[device-automation][adb-track-devices] ${message}`);
      }
    });
    this.#child.on("error", (error) => {
      console.warn("[device-automation] adb 设备变化监听启动失败", error);
    });
    this.#child.on("exit", () => {
      this.#child = null;
      if (!this.#stopping) {
        this.#restartTimer = setTimeout(() => {
          this.#restartTimer = null;
          this.start();
        }, this.#restartDelayMs);
      }
    });
  }

  stop(): void {
    this.#stopping = true;
    if (this.#changeTimer) {
      clearTimeout(this.#changeTimer);
      this.#changeTimer = null;
    }
    if (this.#restartTimer) {
      clearTimeout(this.#restartTimer);
      this.#restartTimer = null;
    }
    this.#child?.kill();
    this.#child = null;
  }

  getAndroidDevices(): AgentDeviceCliRecord[] {
    return this.#devices
      .filter((device) => device.state === "device")
      .map((device) => ({
        platform: "android",
        id: device.id,
        name: device.id,
        kind: "device",
        target: device.id,
        booted: true,
      }));
  }

  #drainBuffer(): void {
    while (true) {
      const index = this.#buffer.indexOf("\n\n");
      if (index < 0) {
        return;
      }
      const frame = this.#buffer.slice(0, index);
      this.#buffer = this.#buffer.slice(index + 2);
      this.#handleFrame(frame);
    }
  }

  #handleFrame(frame: string): void {
    const devices = parseTrackDevicesFrame(frame);
    const snapshot = normalizeDeviceSnapshot(devices);
    if (this.#initialized && snapshot === this.#lastSnapshot) {
      return;
    }
    const hadPreviousSnapshot = this.#initialized;
    this.#initialized = true;
    this.#lastSnapshot = snapshot;
    this.#devices = devices;
    if (!hadPreviousSnapshot) {
      this.#onInitialSnapshot?.();
    } else {
      this.#scheduleChangeEvent();
    }
  }

  #scheduleChangeEvent(): void {
    if (this.#changeTimer) {
      clearTimeout(this.#changeTimer);
    }
    this.#changeTimer = setTimeout(() => {
      this.#changeTimer = null;
      this.#emit(DEVICE_AUTOMATION_INVENTORY_CHANGED_EVENT, {
        source: "adb-track-devices",
        changedAt: new Date().toISOString(),
      } satisfies DeviceInventoryChangePayload);
    }, this.#debounceMs);
  }
}

export function parseTrackDevicesFrame(frame: string): DeviceState[] {
  const lines = frame
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const devices: DeviceState[] = [];
  for (const line of lines) {
    if (line.startsWith("List of devices")) {
      continue;
    }
    const [id, state] = line.split(/\s+/);
    if (!id || !state) {
      continue;
    }
    devices.push({ id, state });
  }
  return devices;
}

export function normalizeDeviceSnapshot(devices: DeviceState[]): string {
  return devices
    .map((device) => `${device.id}\t${device.state}`)
    .sort()
    .join("\n");
}

export function resolveAdbPath(env: NodeJS.ProcessEnv): string | null {
  const configured = env.DEVICE_AUTOMATION_ADB?.trim();
  if (configured) {
    return configured;
  }
  const platformTools = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
  if (platformTools) {
    const candidate = path.join(
      platformTools,
      "platform-tools",
      process.platform === "win32" ? "adb.exe" : "adb",
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  const packagedAdbRoot = resolveToolRoot({
    envVar: "DEVICE_AUTOMATION_ADB_DIR",
    siblingDirName: "adb",
    packagedSubdir: path.join("device-automation", "adb"),
  });
  if (packagedAdbRoot) {
    const candidate = path.join(
      packagedAdbRoot,
      process.platform === "win32" ? "adb.exe" : "adb",
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  const autoGlmRoot = resolveToolRoot({
    envVar: "DEVICE_AUTOMATION_AUTOGLM_ROOT",
    siblingDirName: "AutoGLM-GUI",
  });
  if (autoGlmRoot) {
    const candidate = path.join(
      autoGlmRoot,
      "resources",
      "adb",
      process.platform === "win32" ? "adb.exe" : "adb",
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return "adb";
}
