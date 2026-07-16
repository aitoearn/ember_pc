/** 单设备互斥：UI Agent / 确定性回放 / 手动录制不得并行占用同一设备（FR-017）。 */

export type DeviceActivityKind =
  | "ui_agent"
  | "flow_replay"
  | "flow_record"
  | "monkey_test";

interface DeviceActivity {
  kind: DeviceActivityKind;
  id: string;
}

class DeviceActivityLock {
  readonly #byDevice = new Map<string, DeviceActivity>();

  tryAcquire(
    deviceId: string,
    kind: DeviceActivityKind,
    id: string,
  ): { ok: true } | { ok: false; message: string } {
    const trimmedDevice = deviceId.trim();
    const trimmedId = id.trim();
    if (!trimmedDevice || !trimmedId) {
      return { ok: false, message: "设备或任务 id 无效" };
    }
    const existing = this.#byDevice.get(trimmedDevice);
    if (existing) {
      const label =
        existing.kind === "ui_agent"
          ? "UI Agent 自然语言执行"
          : existing.kind === "flow_replay"
            ? "确定性流回放"
            : existing.kind === "flow_record"
              ? "手动流录制"
              : "Monkey 稳定性测试";
      return {
        ok: false,
        message: `设备 ${trimmedDevice} 正被「${label}」（${existing.id}）占用，请先结束后再试`,
      };
    }
    this.#byDevice.set(trimmedDevice, { kind, id: trimmedId });
    return { ok: true };
  }

  release(deviceId: string, id: string): void {
    const trimmedDevice = deviceId.trim();
    const existing = this.#byDevice.get(trimmedDevice);
    if (existing?.id === id.trim()) {
      this.#byDevice.delete(trimmedDevice);
    }
  }

  isBusy(deviceId: string): boolean {
    return this.#byDevice.has(deviceId.trim());
  }

  clearForTests(): void {
    this.#byDevice.clear();
  }
}

export const deviceActivityLock = new DeviceActivityLock();
