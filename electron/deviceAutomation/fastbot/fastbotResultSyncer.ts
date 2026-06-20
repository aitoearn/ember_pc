import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { execAdbSync } from "../scrcpyAdbFastPath";

export interface FastbotResultSyncerOptions {
  deviceId: string;
  deviceOutputDir: string;
  localOutputDir: string;
  /** 拉取完成后是否删除设备端输出目录（对齐 Kea2 ResultSyncer.close）。 */
  cleanupDeviceAfterPull?: boolean;
}

/**
 * Fastbot 结果同步器（对齐 Kea2 ResultSyncer）：adb pull 设备输出目录到本地。
 */
export class FastbotResultSyncer {
  readonly #deviceId: string;
  readonly #deviceOutputDir: string;
  readonly #localOutputDir: string;
  readonly #cleanupDevice: boolean;
  #closed = false;

  constructor(options: FastbotResultSyncerOptions) {
    this.#deviceId = options.deviceId;
    this.#deviceOutputDir = options.deviceOutputDir.trim();
    this.#localOutputDir = options.localOutputDir.trim();
    this.#cleanupDevice = options.cleanupDeviceAfterPull ?? false;
    mkdirSync(this.#localOutputDir, { recursive: true });
  }

  get localOutputDir(): string {
    return this.#localOutputDir;
  }

  /** 触发一次 pull（profile-period 或结束时调用）。 */
  sync(): void {
    if (this.#closed) {
      return;
    }
    pullDeviceDirectory(
      this.#deviceId,
      this.#deviceOutputDir,
      this.#localOutputDir,
    );
    cleanupPulledScreenshotsOnDevice(this.#deviceId, this.#deviceOutputDir);
  }

  /** 最终同步；可选清理设备端目录。 */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.sync();
    if (this.#cleanupDevice) {
      removeDeviceDirectory(this.#deviceId, this.#deviceOutputDir);
    }
  }
}

export function resolveMonkeySessionLocalDir(
  resultsRoot: string,
  sessionId: string,
): string {
  return path.join(resultsRoot, sessionId);
}

export function pullDeviceDirectory(
  deviceId: string,
  remoteDir: string,
  localDir: string,
): void {
  if (!remoteDir || !localDir) {
    return;
  }
  mkdirSync(localDir, { recursive: true });
  const result = execAdbSync(deviceId, ["pull", remoteDir, localDir]);
  if (result.exitCode !== 0) {
    throw new Error(
      `adb pull 失败：${remoteDir} → ${localDir} — ${result.stderr || result.stdout}`,
    );
  }
}

function cleanupPulledScreenshotsOnDevice(
  deviceId: string,
  deviceOutputDir: string,
): void {
  execAdbSync(deviceId, [
    "shell",
    "find",
    deviceOutputDir,
    "-name",
    "*.png",
    "-delete",
  ]);
}

function removeDeviceDirectory(deviceId: string, deviceOutputDir: string): void {
  execAdbSync(deviceId, ["shell", "rm", "-rf", deviceOutputDir]);
}

export function resetLocalOutputDirForTests(localDir: string): void {
  rmSync(localDir, { recursive: true, force: true });
}
