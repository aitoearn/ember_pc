import { describe, expect, it } from "vitest";
import { canLinkTraceToApmSession } from "./apmTraceBridge";

describe("canLinkTraceToApmSession", () => {
  it("APM 运行且设备/包名一致时可关联", () => {
    expect(
      canLinkTraceToApmSession(
        {
          sessionId: "sess-1",
          isRunning: true,
          deviceId: "dev-1",
          packageName: "com.demo",
        },
        "dev-1",
        "com.demo",
      ),
    ).toBe(true);
  });

  it("设备或包名不一致时不可关联", () => {
    expect(
      canLinkTraceToApmSession(
        {
          sessionId: "sess-1",
          isRunning: true,
          deviceId: "dev-1",
          packageName: "com.demo",
        },
        "dev-2",
        "com.demo",
      ),
    ).toBe(false);
  });
});
