import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  listScrcpyServerPathCandidates,
  resolveScrcpyServerPath,
} from "./scrcpyServerPath";

const tempDirs: string[] = [];
const originalEnv = process.env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH;
  } else {
    process.env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH = originalEnv;
  }
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("scrcpyServerPath", () => {
  it("优先命中 resources/device-automation/scrcpy.jar", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "ember-scrcpy-path-"));
    tempDirs.push(cwd);
    const jarPath = path.join(cwd, "resources", "device-automation", "scrcpy.jar");
    mkdirSync(path.dirname(jarPath), { recursive: true });
    writeFileSync(jarPath, "jar");

    expect(resolveScrcpyServerPath(cwd)).toBe(jarPath);
  });

  it("环境变量指向不存在文件时会继续尝试其他候选路径", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "ember-scrcpy-path-"));
    tempDirs.push(cwd);
    process.env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH = path.join(cwd, "missing.jar");
    const jarPath = path.join(cwd, ".tmp", "device-automation", "scrcpy.jar");
    mkdirSync(path.dirname(jarPath), { recursive: true });
    writeFileSync(jarPath, "jar");

    expect(resolveScrcpyServerPath(cwd)).toBe(jarPath);
    expect(listScrcpyServerPathCandidates(cwd)[0]).toBe(path.join(cwd, "missing.jar"));
  });

  it("electron:dev 主进程 cwd 不在仓库根时仍能命中模块相对路径", () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const devHostCwd = path.join(repoRoot, ".ember", "electron-dev-host");
    expect(resolveScrcpyServerPath(devHostCwd)).toBe(
      path.join(repoRoot, "resources", "device-automation", "scrcpy.jar"),
    );
  });
});
