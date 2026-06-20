import { describe, expect, it, vi, beforeEach } from "vitest";

const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn(),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: spawnSyncMock,
  };
});

import { bootstrapUiautomator2ForFastbot } from "./fastbotU2Bootstrap";

describe("bootstrapUiautomator2ForFastbot", () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
  });

  it("uiautomator2 成功时返回", () => {
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: "u2_bootstrap_ok\n",
      stderr: "",
    });

    const logs: string[] = [];
    bootstrapUiautomator2ForFastbot("emulator-5554", (msg) => logs.push(msg));

    expect(spawnSyncMock).toHaveBeenCalled();
    expect(logs.some((line) => line.includes("uiautomator2 已就绪"))).toBe(true);
  });

  it("未安装 uiautomator2 时提示 pip install", () => {
    spawnSyncMock.mockReturnValue({
      status: 2,
      stdout: "missing_uiautomator2\n",
      stderr: "",
    });

    expect(() => bootstrapUiautomator2ForFastbot("device-1")).toThrow(
      /electron:ensure:fastbot-python/,
    );
  });

  it("空 deviceId 抛错", () => {
    expect(() => bootstrapUiautomator2ForFastbot("  ")).toThrow("deviceId");
  });
});
