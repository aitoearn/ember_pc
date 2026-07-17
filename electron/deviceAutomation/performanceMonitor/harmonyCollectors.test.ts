import { describe, expect, it, vi } from "vitest";
import {
  collectHarmonyPerfSample,
  listHarmonyPackages,
  parseHarmonyPackages,
  parseSpDaemonValue,
  type HdcExecSync,
} from "./harmonyCollectors";

/** 真实 SP_daemon `-N 1 -PKG <pkg> -c -r -f` 输出片段（合并 CPU/内存/FPS 块）。 */
const SP_DAEMON_OUTPUT = [
  "order:0 timestamp=1501839151499",
  "order:1 ProcAppName=ohos.samples.ecg",
  "order:2 ProcCpuLoad=0.000000",
  "order:3 ProcCpuUsage=36.177645",
  "order:4 ProcId=2111",
  "order:5 ProcSCpuUsage=8.982036",
  "order:6 ProcUCpuUsage=27.195609",
  "order:7 TotalcpuUsage=62.500000",
  "order:8 TotalcpuidleUsage=37.500000",
  "order:9 nativeHeapPss=49102",
  "order:10 pss=422172",
  "order:11 stackPss=1588",
  "order:12 fps=43",
  "order:13 fpsJitters=602261688;;8352083;;8267708",
  "order:14 refreshrate=69",
  "command exec finished!",
].join("\n");

describe("parseSpDaemonValue", () => {
  it("按前缀锚定解析标量，避免误匹配相似字段", () => {
    expect(parseSpDaemonValue(SP_DAEMON_OUTPUT, "ProcCpuUsage")).toBeCloseTo(36.177645);
    expect(parseSpDaemonValue(SP_DAEMON_OUTPUT, "TotalcpuUsage")).toBeCloseTo(62.5);
    // pss 不应命中 nativeHeapPss / stackPss
    expect(parseSpDaemonValue(SP_DAEMON_OUTPUT, "pss")).toBe(422172);
    // fps 不应命中 fpsJitters
    expect(parseSpDaemonValue(SP_DAEMON_OUTPUT, "fps")).toBe(43);
  });

  it("字段缺失返回 undefined", () => {
    expect(parseSpDaemonValue("order:0 timestamp=1", "gpuLoad")).toBeUndefined();
  });

  it("多块输出取最后一次出现的值", () => {
    const multi = "order:1 fps=30\norder:1 fps=45";
    expect(parseSpDaemonValue(multi, "fps")).toBe(45);
  });
});

describe("parseHarmonyPackages", () => {
  it("解析 bm dump -a 的包名列表并去重排序", () => {
    const output = [
      "ID: 100",
      "\tbundle name list:",
      "\tohos.samples.ecg",
      "\tcom.example.app",
      "\tcom.example.app",
      "\tinvalidname",
      "",
    ].join("\n");
    expect(parseHarmonyPackages(output)).toEqual([
      "com.example.app",
      "ohos.samples.ecg",
    ]);
  });
});

function createMockHdc(): HdcExecSync {
  return vi.fn((_deviceId, args) => {
    if (args.includes("bm") && args.includes("dump")) {
      return {
        stdout: "ID: 100\n\tohos.samples.ecg\n\tcom.example.app\n",
        stderr: "",
        exitCode: 0,
      };
    }
    if (args.includes("SP_daemon")) {
      return { stdout: SP_DAEMON_OUTPUT, stderr: "", exitCode: 0 };
    }
    return { stdout: "", stderr: "", exitCode: 0 };
  });
}

describe("collectHarmonyPerfSample", () => {
  it("按所选指标解析 CPU/内存/FPS", () => {
    const { data } = collectHarmonyPerfSample({
      execHdcSync: createMockHdc(),
      deviceId: "harmony-1",
      packageName: "ohos.samples.ecg",
      metrics: new Set(["cpu", "memory", "fps"] as const),
    });
    expect(data.cpu_app).toBeCloseTo(36.177645);
    expect(data.cpu_sys).toBeCloseTo(62.5);
    expect(data.mem_total).toBeCloseTo(422172 / 1024);
    expect(data.fps).toBe(43);
  });

  it("仅请求 fps 时只带 SP_daemon -f 标志且只解析 fps", () => {
    const hdc = createMockHdc();
    const { data } = collectHarmonyPerfSample({
      execHdcSync: hdc,
      deviceId: "harmony-1",
      packageName: "ohos.samples.ecg",
      metrics: new Set(["fps"] as const),
    });
    expect(data.fps).toBe(43);
    expect(data.cpu_app).toBeUndefined();
    const call = (hdc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toContain("-f");
    expect(call[1]).not.toContain("-c");
    expect(call[1]).not.toContain("-r");
  });

  it("输出无 order: 前缀视为不可用，返回空数据", () => {
    const hdc: HdcExecSync = vi.fn(() => ({
      stdout: "SP_daemon: not found",
      stderr: "",
      exitCode: 127,
    }));
    const { data } = collectHarmonyPerfSample({
      execHdcSync: hdc,
      deviceId: "harmony-1",
      packageName: "ohos.samples.ecg",
      metrics: new Set(["cpu"] as const),
    });
    expect(data).toEqual({});
  });
});

describe("listHarmonyPackages", () => {
  it("通过 bm dump -a 返回包名", () => {
    expect(
      listHarmonyPackages({ execHdcSync: createMockHdc(), deviceId: "harmony-1" }),
    ).toEqual(["com.example.app", "ohos.samples.ecg"]);
  });
});
