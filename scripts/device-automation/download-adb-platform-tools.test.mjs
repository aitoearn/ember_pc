import { describe, expect, it } from "vitest";
import {
  adbFilesForPlatform,
  buildPlatformToolsUrl,
  parseArgs,
  platformToolsLabel,
} from "./download-adb-platform-tools.mjs";

describe("download-adb-platform-tools", () => {
  it("按平台生成 Google platform-tools 下载地址", () => {
    expect(platformToolsLabel("darwin")).toBe("darwin");
    expect(platformToolsLabel("win32")).toBe("windows");
    expect(platformToolsLabel("linux")).toBe("linux");
    expect(buildPlatformToolsUrl("darwin")).toBe(
      "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip",
    );
  });

  it("按平台选择 adb 必要文件", () => {
    expect(adbFilesForPlatform("darwin")).toEqual(["adb"]);
    expect(adbFilesForPlatform("win32")).toEqual([
      "adb.exe",
      "AdbWinApi.dll",
      "AdbWinUsbApi.dll",
    ]);
  });

  it("解析输出目录和目标平台参数", () => {
    expect(
      parseArgs(["--platform", "win32", "--output", "tmp/adb"], {}),
    ).toEqual({
      platform: "win32",
      output: "tmp/adb",
    });
  });
});
