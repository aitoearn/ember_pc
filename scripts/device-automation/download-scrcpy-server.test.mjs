import { describe, expect, it } from "vitest";
import {
  buildScrcpyServerUrl,
  parseArgs,
} from "./download-scrcpy-server.mjs";

describe("download-scrcpy-server", () => {
  it("生成 Genymobile scrcpy server 下载地址", () => {
    expect(buildScrcpyServerUrl("3.1")).toBe(
      "https://github.com/Genymobile/scrcpy/releases/download/v3.1/scrcpy-server-v3.1",
    );
    expect(buildScrcpyServerUrl("v3.1")).toBe(
      "https://github.com/Genymobile/scrcpy/releases/download/v3.1/scrcpy-server-v3.1",
    );
  });

  it("解析版本与输出路径参数", () => {
    expect(
      parseArgs([
        "--version",
        "3.2",
        "--output",
        "resources/device-automation/scrcpy-3.2.jar",
      ]),
      {},
    ).toEqual({
      version: "3.2",
      output: "resources/device-automation/scrcpy-3.2.jar",
    });
  });
});
