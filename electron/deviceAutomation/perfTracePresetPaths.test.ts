import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  listPerfTracePresetDirCandidates,
  resolvePerfTracePresetFilePath,
} from "./perfTracePresetPaths";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("perfTracePresetPaths", () => {
  it("开发态命中源码 electron/deviceAutomation/perfTrace/presets", () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const resolved = resolvePerfTracePresetFilePath("cold_start", repoRoot);
    expect(resolved).toContain("cold_start.txt");
    expect(resolved).toContain("perfTrace");
  });

  it("dist-electron/main/perfTrace/presets 候选可解析", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "ember-perf-preset-"));
    tempDirs.push(cwd);
    const presetDir = path.join(cwd, "dist-electron", "main", "perfTrace", "presets");
    mkdirSync(presetDir, { recursive: true });
    const presetPath = path.join(presetDir, "scroll_jank.txt");
    writeFileSync(presetPath, "buffers { }", "utf8");

    expect(resolvePerfTracePresetFilePath("scroll_jank", cwd)).toBe(presetPath);
    expect(listPerfTracePresetDirCandidates(cwd)).toContain(presetDir);
  });
});
