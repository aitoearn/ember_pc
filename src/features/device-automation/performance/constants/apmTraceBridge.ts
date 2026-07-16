/** P1 APM 与 P2 Trace 桥接上下文（由 PerformanceMonitorPanel 注入） */
export interface PerformanceApmBridge {
  sessionId: string | null;
  isRunning: boolean;
  deviceId: string;
  packageName: string;
}

export const EMPTY_PERFORMANCE_APM_BRIDGE: PerformanceApmBridge = {
  sessionId: null,
  isRunning: false,
  deviceId: "",
  packageName: "",
};

export function canLinkTraceToApmSession(
  bridge: PerformanceApmBridge,
  deviceId: string,
  packageName: string,
): boolean {
  return (
    bridge.isRunning &&
    Boolean(bridge.sessionId) &&
    bridge.deviceId === deviceId &&
    bridge.packageName === packageName &&
    deviceId.length > 0 &&
    packageName.length > 0
  );
}
