import { teardownDeviceAutomationScrcpySession } from "@/lib/api/deviceAutomation";
import {
  SCRCPY_DEFAULT_MAX_SIZE,
  SCRCPY_DEFAULT_VIDEO_BIT_RATE,
} from "./scrcpyDefaults";
import { ScrcpyDirectClient } from "./ScrcpyDirectClient";
import {
  buildScrcpyReverseRemote,
  deriveAyaScrcpyScid,
} from "./scrcpySession";
import type { DeviceAutomationCardModel } from "../types";

type SessionState = {
  client: ScrcpyDirectClient | null;
  deviceId: string | null;
};

const session: SessionState = {
  client: null,
  deviceId: null,
};

/** 防止 teardown 与下一次 start 竞态（路由快速切换）。 */
let teardownInFlight: Promise<void> | null = null;

function buildClient(device: DeviceAutomationCardModel): ScrcpyDirectClient {
  const scid = deriveAyaScrcpyScid(device.id);
  const remote = buildScrcpyReverseRemote(device.id);
  return new ScrcpyDirectClient({
    deviceId: device.id,
    scid,
    remote,
    maxSize: SCRCPY_DEFAULT_MAX_SIZE,
    videoBitRate: SCRCPY_DEFAULT_VIDEO_BIT_RATE,
    audio: false,
    control: true,
  });
}

/**
 * 进入投屏页：等待上一轮 teardown 完成后新建 ScrcpyClient（constructor 内 start）。
 * 不跨路由复用 client，避免 stream 已 locked 导致二次 pipeTo 被跳过。
 */
export async function acquireDeviceScrcpySession(
  device: DeviceAutomationCardModel,
): Promise<ScrcpyDirectClient> {
  if (teardownInFlight) {
    await teardownInFlight;
  }
  session.client?.close();
  session.client = null;
  session.deviceId = null;

  const client = buildClient(device);
  session.client = client;
  session.deviceId = device.id;
  return client;
}

/**
 * 离开投屏页：client.destroy（关 renderer TCP）→ IPC teardown（pkill + remove reverse）。
 */
export async function destroyDeviceScrcpySession(deviceId?: string): Promise<void> {
  if (deviceId && session.deviceId && session.deviceId !== deviceId) {
    return;
  }

  const teardownDeviceId = session.deviceId ?? deviceId;
  session.client?.close();
  session.client = null;
  session.deviceId = null;

  if (!teardownDeviceId) {
    return;
  }

  const remote = buildScrcpyReverseRemote(teardownDeviceId);
  const runTeardown = async (): Promise<void> => {
    try {
      await teardownDeviceAutomationScrcpySession({
        deviceId: teardownDeviceId,
        remote,
        killServer: true,
      });
      console.info(
        `[scrcpy] 会话已 teardown deviceId=${teardownDeviceId} remote=${remote}`,
      );
    } catch (error) {
      console.warn("[scrcpy] teardown 失败:", error);
    }
  };

  const promise = runTeardown();
  teardownInFlight = promise;
  await promise;
  if (teardownInFlight === promise) {
    teardownInFlight = null;
  }
}

/** @deprecated 使用 destroyDeviceScrcpySession */
export const releaseDeviceScrcpySession = destroyDeviceScrcpySession;

export function getActiveDeviceScrcpySession(): ScrcpyDirectClient | null {
  if (session.client?.closed) {
    return null;
  }
  return session.client;
}

/** 测试专用：立即清空会话。 */
export function resetDeviceScrcpySessionForTests(): void {
  session.client?.close();
  session.client = null;
  session.deviceId = null;
  teardownInFlight = null;
}
