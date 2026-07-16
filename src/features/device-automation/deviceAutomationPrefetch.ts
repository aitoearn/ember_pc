import { listDeviceAutomationDevices } from "@/lib/api/deviceAutomation";
import { hasDesktopHostInvokeCapability } from "@/lib/desktop-runtime";
import { projectAgentDevices } from "./domain/deviceProjection";
import {
  readCachedDeviceAutomationList,
  writeCachedDeviceAutomationList,
} from "./deviceListSessionCache";
import { loadDeviceAutomationWorkspace } from "./loadDeviceAutomationWorkspace";

let workspaceChunkPrefetch: Promise<unknown> | null = null;
let deviceListPrefetch: Promise<void> | null = null;

/** 预拉 lazy chunk，减少首次进入端自动化页的 JS 等待。 */
export function prefetchDeviceAutomationWorkspaceChunk(): void {
  if (!workspaceChunkPrefetch) {
    workspaceChunkPrefetch = loadDeviceAutomationWorkspace().catch(() => {
      workspaceChunkPrefetch = null;
    });
  }
}

/** 预拉设备列表并写入会话缓存，进页时可 stale-while-revalidate。 */
export function preloadDeviceAutomationDeviceList(): void {
  if (!hasDesktopHostInvokeCapability()) {
    return;
  }
  if (deviceListPrefetch) {
    return;
  }
  if (readCachedDeviceAutomationList() !== null) {
    return;
  }

  deviceListPrefetch = listDeviceAutomationDevices()
    .then((response) => {
      writeCachedDeviceAutomationList(
        projectAgentDevices(response.devices ?? []),
      );
    })
    .catch(() => {
      // 静默失败，不影响应用启动
    })
    .finally(() => {
      deviceListPrefetch = null;
    });
}

/** 应用启动或侧栏 hover 时一并预热 chunk 与设备列表。 */
export function prefetchDeviceAutomationStartup(): void {
  prefetchDeviceAutomationWorkspaceChunk();
  preloadDeviceAutomationDeviceList();
}

/**
 * 首页渲染后再预热：优先用 idle，超时仍强制启动，避免拖到用户点开设备管理才查。
 */
export function scheduleDeviceAutomationPrefetchAfterHome(): void {
  const run = () => {
    prefetchDeviceAutomationStartup();
  };

  if (
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
  ) {
    window.requestIdleCallback(() => run(), { timeout: 400 });
    return;
  }

  window.setTimeout(run, 0);
}

/** 测试专用：重置 prefetch 进行中的 promise。 */
export function resetDeviceAutomationPrefetchStateForTests(): void {
  workspaceChunkPrefetch = null;
  deviceListPrefetch = null;
}
