import { describe, expect, it } from "vitest";
import {
  computeFps,
  computeSystemCpuPercent,
  parseGfxinfoTotalFrames,
  parseMeminfoPssMb,
  parseProcStatLine,
  parseThirdPartyPackages,
  parseTopAppCpu,
} from "./androidCollectors";

describe("androidCollectors", () => {
  it("解析第三方应用列表", () => {
    const stdout = `
package:com.example.demo
package:com.other.app
`;
    expect(parseThirdPartyPackages(stdout)).toEqual([
      "com.example.demo",
      "com.other.app",
    ]);
  });

  it("解析 /proc/stat 并差分系统 CPU", () => {
    const previous = parseProcStatLine("cpu  1000 100 200 600 50 0 0 0 0 0");
    const current = parseProcStatLine("cpu  2000 150 250 1100 80 0 0 0 0 0");
    expect(previous).toBeDefined();
    expect(current).toBeDefined();
    const percent = computeSystemCpuPercent(previous!, current!);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it("解析 top 应用 CPU", () => {
    const stdout = `
Tasks: 1 total,   1 running,   0 sleeping,   0 stopped,   0 zombie
  PID USER         PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ ARGS
12345 u0_a123      10 -10  12G  120M  80M S  15.3   2.1   0:03.21 com.example.demo
`;
    expect(parseTopAppCpu(stdout, "com.example.demo")).toBe(15.3);
  });

  it("解析 meminfo TOTAL PSS", () => {
    const stdout = `
Applications Memory Usage (in Kilobytes):
Uptime: 123456 Realtime: 654321

TOTAL PSS:   204800
`;
    expect(parseMeminfoPssMb(stdout)).toBeCloseTo(200, 1);
  });

  it("解析 gfxinfo 帧数并估算 FPS", () => {
    const stdout = `
Graphics info for pid 12345 [com.example.demo]:
Total frames rendered: 120
`;
    expect(parseGfxinfoTotalFrames(stdout)).toBe(120);
    expect(computeFps(30, 1000)).toBe(30);
  });
});
