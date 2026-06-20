import { describe, expect, it } from "vitest";
import { ScrcpyReadinessGate } from "./scrcpyReadiness";

describe("scrcpyReadiness", () => {
  it("signal 后 wait 立即 resolve", async () => {
    const gate = new ScrcpyReadinessGate();
    const pending = gate.wait("video");
    gate.signal("video");
    await expect(pending).resolves.toBeUndefined();
  });

  it("reset 后需重新 signal", async () => {
    const gate = new ScrcpyReadinessGate();
    gate.signal("video");
    gate.reset();
    let resolved = false;
    void gate.wait("video").then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    gate.signal("video");
    await gate.wait("video");
    expect(resolved).toBe(true);
  });
});
