/** agent-device 在 session 已存在且无 app 参数再次 open 时返回此错误，可视为 attach 已完成。 */
export function isAgentDeviceSessionAlreadyActiveMessage(
  message: string | undefined,
): boolean {
  if (!message) {
    return false;
  }
  return message.includes("Session already active");
}

export function isAgentDeviceSessionAlreadyActiveFailure(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return isAgentDeviceSessionAlreadyActiveMessage(error.message);
}

/**
 * agent-device 在 session 已绑定到「另一台设备」时返回此错误，例如旧设备已断开、用户切换到新设备。
 * 文案形如：`Session "ember-device-automation" is already bound to android device "X", but this request selected --serial=Y`。
 * 命中后应先 close 旧会话再用新设备重新 open。
 */
export function isAgentDeviceSessionBoundToOtherDeviceMessage(
  message: string | undefined,
): boolean {
  if (!message) {
    return false;
  }
  return message.includes("is already bound to");
}

export function isAgentDeviceSessionBoundToOtherDeviceFailure(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return isAgentDeviceSessionBoundToOtherDeviceMessage(error.message);
}
