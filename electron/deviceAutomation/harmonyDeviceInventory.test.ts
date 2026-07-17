import { describe, expect, it, vi } from "vitest";
import type { HdcExecSync } from "./resolveHdcPath";
import { listHarmonyDevices, parseHdcTargets } from "./harmonyDeviceInventory";

describe("parseHdcTargets", () => {
  it("解析普通模式的序列号列表", () => {
    expect(parseHdcTargets("FMR0223C13000680\n")).toEqual(["FMR0223C13000680"]);
  });

  it("解析 -v 详细模式，取首列序列号", () => {
    const output = "FMR0223C13000680\t\tUSB\tConnected\tlocalhost\n";
    expect(parseHdcTargets(output)).toEqual(["FMR0223C13000680"]);
  });

  it("多设备去重排序保持出现顺序并去重", () => {
    const output = "AAA111\nBBB222\nAAA111\n";
    expect(parseHdcTargets(output)).toEqual(["AAA111", "BBB222"]);
  });

  it("忽略 [Empty] 与提示行", () => {
    expect(parseHdcTargets("[Empty]\n")).toEqual([]);
    expect(parseHdcTargets("[Fail]Cannot connect\n")).toEqual([]);
    expect(parseHdcTargets("\n\n")).toEqual([]);
  });
});

describe("listHarmonyDevices", () => {
  it("将 hdc 目标映射为 harmony AgentDeviceCliRecord", () => {
    const exec: HdcExecSync = vi.fn(() => ({
      stdout: "FMR0223C13000680\n",
      stderr: "",
      exitCode: 0,
    }));
    expect(listHarmonyDevices(exec)).toEqual([
      {
        platform: "harmony",
        id: "FMR0223C13000680",
        name: "FMR0223C13000680",
        kind: "device",
        target: "FMR0223C13000680",
        booted: true,
      },
    ]);
    expect((exec as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
      "",
      ["list", "targets"],
    ]);
  });

  it("无设备时返回空数组", () => {
    const exec: HdcExecSync = vi.fn(() => ({
      stdout: "[Empty]\n",
      stderr: "",
      exitCode: 0,
    }));
    expect(listHarmonyDevices(exec)).toEqual([]);
  });

  it("hdc 执行失败时降级为空数组，不抛错", () => {
    const exec: HdcExecSync = vi.fn(() => {
      throw new Error("hdc not found");
    });
    expect(listHarmonyDevices(exec)).toEqual([]);
  });
});
