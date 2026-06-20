/** 进程内缓存：已成功 open 的设备 session，避免重复 open。 */
const ensuredSessionKeys = new Set<string>();

export function buildAgentDeviceSessionCacheKey(
  platform: string,
  deviceId: string,
): string {
  return `${platform.trim().toLowerCase()}:${deviceId.trim()}`;
}

export function isAgentDeviceSessionEnsured(
  platform: string,
  deviceId: string,
): boolean {
  return ensuredSessionKeys.has(
    buildAgentDeviceSessionCacheKey(platform, deviceId),
  );
}

export function markAgentDeviceSessionEnsured(
  platform: string,
  deviceId: string,
): void {
  ensuredSessionKeys.add(
    buildAgentDeviceSessionCacheKey(platform, deviceId),
  );
}

export function clearAgentDeviceSessionEnsured(
  platform: string,
  deviceId: string,
): void {
  ensuredSessionKeys.delete(
    buildAgentDeviceSessionCacheKey(platform, deviceId),
  );
}

/** 清空所有已 ensure 的 session 缓存（切换设备、关闭会话后调用，避免旧设备缓存残留）。 */
export function clearAllAgentDeviceSessionEnsured(): void {
  ensuredSessionKeys.clear();
}

/** 仅测试使用：重置 session 缓存。 */
export function resetAgentDeviceSessionCacheForTests(): void {
  ensuredSessionKeys.clear();
}
