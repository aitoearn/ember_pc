#!/usr/bin/env node

/**
 * 校验华为 hoscrcpy SDK jar 是否就位，并编译 Ember 侧的 Java wrapper。
 *
 * - SDK jar（hosScrcpy-*.jar）为华为授权产物，需人工放入
 *   resources/device-automation/hoscrcpy/（对齐 scrcpy.jar 的资源约定）。
 * - wrapper 源码在 electron/deviceAutomation/harmonyScrcpy/java/，本脚本用 javac
 *   编译为 resources/device-automation/hoscrcpy/harmony-scrcpy-wrapper.jar。
 * - SDK jar 缺失时仅告警并跳过（鸿蒙投屏在运行时降级为不可用），不阻断整体构建。
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const HOSCRCPY_DIR = path.join(REPO_ROOT, "resources/device-automation/hoscrcpy");
const WRAPPER_SRC_DIR = path.join(
  REPO_ROOT,
  "electron/deviceAutomation/harmonyScrcpy/java",
);
const WRAPPER_SRC = path.join(
  WRAPPER_SRC_DIR,
  "com/lime/harmonyscrcpy/HarmonyScrcpyWrapper.java",
);
const WRAPPER_JAR = path.join(HOSCRCPY_DIR, "harmony-scrcpy-wrapper.jar");
const WRAPPER_MAIN = "com.lime.harmonyscrcpy.HarmonyScrcpyWrapper";

/** 定位 hoscrcpy SDK jar（hosScrcpy-*.jar，排除我们自己的 wrapper jar）。 */
export function findHoscrcpySdkJar(dir = HOSCRCPY_DIR) {
  if (!existsSync(dir)) {
    return null;
  }
  const candidates = readdirSync(dir)
    .filter(
      (name) =>
        /^hos.*scrcpy.*\.jar$/i.test(name) &&
        name !== path.basename(WRAPPER_JAR),
    )
    .sort();
  if (candidates.length === 0) {
    return null;
  }
  return path.join(dir, candidates[candidates.length - 1]);
}

function isWrapperUpToDate() {
  if (!existsSync(WRAPPER_JAR)) {
    return false;
  }
  try {
    return statSync(WRAPPER_JAR).mtimeMs >= statSync(WRAPPER_SRC).mtimeMs;
  } catch {
    return false;
  }
}

function hasJavac() {
  try {
    execFileSync("javac", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function ensureHoscrcpy() {
  const sdkJar = findHoscrcpySdkJar();
  if (!sdkJar) {
    console.warn(
      `[device-automation] 未找到 hoscrcpy SDK jar（${HOSCRCPY_DIR}/hosScrcpy-*.jar）。` +
        "鸿蒙投屏将不可用；请将华为 hoscrcpy jar 放入该目录后重试。",
    );
    return { sdkJar: null, wrapperJar: null };
  }

  if (isWrapperUpToDate()) {
    console.log(`[device-automation] hoscrcpy wrapper 已是最新：${WRAPPER_JAR}`);
    return { sdkJar, wrapperJar: WRAPPER_JAR };
  }

  if (!hasJavac()) {
    console.warn(
      "[device-automation] 未找到 javac（需 JDK 8+），无法编译 hoscrcpy wrapper，鸿蒙投屏将不可用。",
    );
    return { sdkJar, wrapperJar: null };
  }

  const tmp = mkdtempSync(path.join(os.tmpdir(), "harmony-scrcpy-"));
  try {
    execFileSync("javac", ["-encoding", "UTF-8", "-cp", sdkJar, "-d", tmp, WRAPPER_SRC], {
      stdio: "inherit",
    });
    execFileSync(
      "jar",
      ["cfe", WRAPPER_JAR, WRAPPER_MAIN, "-C", tmp, "com"],
      { stdio: "inherit" },
    );
    console.log(`[device-automation] hoscrcpy wrapper 已编译：${WRAPPER_JAR}`);
    return { sdkJar, wrapperJar: WRAPPER_JAR };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureHoscrcpy();
}
