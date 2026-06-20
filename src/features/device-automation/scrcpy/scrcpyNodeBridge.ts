import type { ScrcpyPreloadServer } from "./scrcpyNodeTypes";
import type { ElectronHostBridge } from "@/lib/electron-host";

export type ScrcpyNodeBridge = NonNullable<ElectronHostBridge["scrcpyNode"]>;

export function isScrcpyNodeBridgeAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const bridge = (window as Window & { electronAPI?: ElectronHostBridge }).electronAPI
    ?.scrcpyNode;
  return typeof bridge?.createServer === "function";
}

export function getScrcpyNodeBridge(): ScrcpyNodeBridge {
  const bridge = (window as Window & { electronAPI?: ElectronHostBridge }).electronAPI
    ?.scrcpyNode;
  if (!bridge?.createServer) {
    throw new Error("当前环境不支持 renderer 直连 scrcpy TCP（需重启 Electron 加载新 preload）");
  }
  return bridge;
}

export type { ScrcpyPreloadServer };
