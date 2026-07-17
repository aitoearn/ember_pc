import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyHdcPathToEnv,
  resolveHdcPath,
} from "./resolveHdcPath";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ember-hdc-path-"));
  tempDirs.push(dir);
  return dir;
}

function touchFile(filePath: string): string {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, "");
  return filePath;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveHdcPath", () => {
  it("优先使用 DEVICE_AUTOMATION_HDC", () => {
    const hdc = "/custom/bin/hdc";
    expect(
      resolveHdcPath({
        DEVICE_AUTOMATION_HDC: `  ${hdc}  `,
        DEVECO_SDK_HOME: "/should-not-use",
      }),
    ).toBe(hdc);
  });

  it("其次使用 DEVICE_AUTOMATION_HDC_DIR 下的 hdc 可执行文件", () => {
    const dir = makeTempDir();
    const hdcName = process.platform === "win32" ? "hdc.exe" : "hdc";
    const hdcPath = touchFile(path.join(dir, hdcName));

    expect(
      resolveHdcPath({
        DEVICE_AUTOMATION_HDC_DIR: dir,
      }),
    ).toBe(hdcPath);
  });

  it("从 DEVECO_SDK_HOME 的 openharmony/toolchains 解析 hdc", () => {
    const sdkRoot = makeTempDir();
    const hdcName = process.platform === "win32" ? "hdc.exe" : "hdc";
    const hdcPath = touchFile(
      path.join(sdkRoot, "default", "openharmony", "toolchains", hdcName),
    );

    expect(
      resolveHdcPath({
        DEVECO_SDK_HOME: sdkRoot,
      }),
    ).toBe(hdcPath);
  });

  it("支持 OHOS_BASE_SDK_HOME 下的 toolchains 布局", () => {
    const sdkRoot = makeTempDir();
    const hdcName = process.platform === "win32" ? "hdc.exe" : "hdc";
    const hdcPath = touchFile(
      path.join(sdkRoot, "openharmony", "toolchains", hdcName),
    );

    expect(
      resolveHdcPath({
        OHOS_BASE_SDK_HOME: sdkRoot,
      }),
    ).toBe(hdcPath);
  });

  it("未配置时回退为 PATH 中的 hdc", () => {
    expect(
      resolveHdcPath(
        {},
        {
          // 隔离本机 DevEco / 打包资源，避免误命中真实路径
          exists: () => false,
        },
      ),
    ).toBe(process.platform === "win32" ? "hdc.exe" : "hdc");
  });
});

describe("applyHdcPathToEnv", () => {
  it("写入 DEVICE_AUTOMATION_HDC，并把绝对路径目录前置到 PATH", () => {
    const dir = makeTempDir();
    const hdcName = process.platform === "win32" ? "hdc.exe" : "hdc";
    const hdcPath = path.join(dir, hdcName);
    const pathKey = process.platform === "win32" ? "Path" : "PATH";
    const sep = path.delimiter;

    const next = applyHdcPathToEnv(
      {
        [pathKey]: `/usr/bin${sep}/bin`,
      },
      hdcPath,
    );

    expect(next.DEVICE_AUTOMATION_HDC).toBe(hdcPath);
    expect(next[pathKey]).toBe(`${dir}${sep}/usr/bin${sep}/bin`);
  });

  it("回退命令名时不改写 PATH", () => {
    const pathKey = process.platform === "win32" ? "Path" : "PATH";
    const next = applyHdcPathToEnv(
      {
        [pathKey]: "/usr/bin",
      },
      "hdc",
    );

    expect(next.DEVICE_AUTOMATION_HDC).toBe("hdc");
    expect(next[pathKey]).toBe("/usr/bin");
  });
});
