import { describe, expect, it } from "vitest";
import {
  isAgentDeviceSessionAlreadyActiveFailure,
  isAgentDeviceSessionAlreadyActiveMessage,
  isAgentDeviceSessionBoundToOtherDeviceFailure,
  isAgentDeviceSessionBoundToOtherDeviceMessage,
} from "./agentDeviceSessionErrors";

describe("agentDeviceSessionErrors", () => {
  it("识别 Session already active 文案", () => {
    expect(
      isAgentDeviceSessionAlreadyActiveMessage(
        "Session already active. Close it first or pass a new --session name.",
      ),
    ).toBe(true);
    expect(isAgentDeviceSessionAlreadyActiveMessage("No active session")).toBe(
      false,
    );
  });

  it("从 Error 对象识别 Session already active", () => {
    expect(
      isAgentDeviceSessionAlreadyActiveFailure(
        new Error(
          '设备自动化服务请求失败：HTTP 400 {"error":{"message":"Session already active"}}',
        ),
      ),
    ).toBe(true);
  });

  it("识别会话绑定到其他设备的冲突文案", () => {
    const message =
      'Session "ember-device-automation" is already bound to android device "HBP AL00" (2NX0225211000873), but this request selected --serial=4GJBB25414005461.';
    expect(isAgentDeviceSessionBoundToOtherDeviceMessage(message)).toBe(true);
    expect(isAgentDeviceSessionBoundToOtherDeviceMessage("Session already active")).toBe(
      false,
    );
    expect(isAgentDeviceSessionBoundToOtherDeviceMessage(undefined)).toBe(false);
  });

  it("从 Error 对象识别会话绑定到其他设备", () => {
    expect(
      isAgentDeviceSessionBoundToOtherDeviceFailure(
        new Error(
          'Session "ember-device-automation" is already bound to android device "X", but this request selected --serial=Y.',
        ),
      ),
    ).toBe(true);
    expect(
      isAgentDeviceSessionBoundToOtherDeviceFailure(new Error("Session already active")),
    ).toBe(false);
  });
});
