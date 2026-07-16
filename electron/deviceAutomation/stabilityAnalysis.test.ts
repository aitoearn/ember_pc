import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as stabilityAnalysis from "./stabilityAnalysis";
import {
  resetStabilityLlmConfigForTests,
  saveStabilityLlmConfig,
  setStabilityLlmConfigRoot,
} from "./stabilityLlmConfig";

const {
  buildStabilityAnalysisCliArgs,
  resetStabilityAnalysisForTests,
  setStabilityAnalysisEventEmitter,
  setStabilityAnalysisResultsRoot,
  setStabilityAnalysisSpawnForTests,
  startStabilityAnalysis,
} = stabilityAnalysis;

describe("buildStabilityAnalysisCliArgs", () => {
  it("包含 --scope full 与 --prompt-mode analysis，并禁用自动改码", () => {
    const args = buildStabilityAnalysisCliArgs({
      cliEntry: "/tmp/sa-agent/cli/main.py",
      crashLogPath: "/tmp/crash.log",
      libraryDir: "/tmp/symbols",
      codeRoots: ["/tmp/code"],
      scope: "full",
      promptMode: "analysis",
      configPath: "/tmp/agent_config.local.json",
    });

    expect(args).toContain("--scope");
    expect(args).toContain("full");
    expect(args).toContain("--prompt-mode");
    expect(args).toContain("analysis");
    expect(args).toContain("--no-apply-ai-fixes");
    expect(args).toContain("--library-dir");
    expect(args).toContain("/tmp/symbols");
    expect(args).toContain("--code-root");
    expect(args).toContain("/tmp/code");
    expect(args).toContain("--config");
  });
});

const SA_AGENT_ROOT = "/Users/lisq/ai/testplatform/perf/stability-analysis-agent";

describe("startStabilityAnalysis", () => {
  let workRoot = "";
  let previousAgentRoot: string | undefined;

  afterEach(() => {
    resetStabilityAnalysisForTests();
    resetStabilityLlmConfigForTests();
    vi.restoreAllMocks();
    if (previousAgentRoot === undefined) {
      delete process.env.STABILITY_ANALYSIS_AGENT_ROOT;
    } else {
      process.env.STABILITY_ANALYSIS_AGENT_ROOT = previousAgentRoot;
    }
    if (workRoot) {
      rmSync(workRoot, { recursive: true, force: true });
      workRoot = "";
    }
  });

  function prepareWorkRoot(): string {
    previousAgentRoot = process.env.STABILITY_ANALYSIS_AGENT_ROOT;
    process.env.STABILITY_ANALYSIS_AGENT_ROOT = SA_AGENT_ROOT;
    workRoot = mkdtempSync(path.join(os.tmpdir(), "ember-stability-test-"));
    setStabilityAnalysisResultsRoot(workRoot);
    setStabilityLlmConfigRoot(workRoot);
    return workRoot;
  }

  it("mock spawn 时 argv 含 full + analysis，并拒绝 promptMode=fix", () => {
    prepareWorkRoot();
    saveStabilityLlmConfig({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      apiKey: "sk-test-key-1234",
      configured: true,
    });

    const spawnCalls: Array<{ command: string; args: string[] }> = [];
    const fakeChild = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof vi.fn>;
    };
    fakeChild.stdout = new EventEmitter();
    fakeChild.stderr = new EventEmitter();
    fakeChild.kill = vi.fn();

    setStabilityAnalysisSpawnForTests(((command: string, args: string[]) => {
      spawnCalls.push({ command, args });
      return fakeChild as never;
    }) as never);

    expect(() =>
      startStabilityAnalysis({
        crashLogPath: __filename,
        promptMode: "fix" as never,
      }),
    ).toThrow("analysis");

    startStabilityAnalysis({
      crashLogPath: __filename,
      scope: "full",
      promptMode: "analysis",
    });

    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.args).toContain("--scope");
    expect(spawnCalls[0]?.args).toContain("full");
    expect(spawnCalls[0]?.args).toContain("--prompt-mode");
    expect(spawnCalls[0]?.args).toContain("analysis");
  });

  it("scope=full 且无 LLM 配置时抛错", () => {
    prepareWorkRoot();

    expect(() =>
      startStabilityAnalysis({
        crashLogContent: "FATAL EXCEPTION",
        scope: "full",
      }),
    ).toThrow("LLM");
  });
});

describe("stability analysis event emitter", () => {
  let workRoot = "";
  let previousAgentRoot: string | undefined;

  afterEach(() => {
    resetStabilityAnalysisForTests();
    resetStabilityLlmConfigForTests();
    vi.restoreAllMocks();
    if (previousAgentRoot === undefined) {
      delete process.env.STABILITY_ANALYSIS_AGENT_ROOT;
    } else {
      process.env.STABILITY_ANALYSIS_AGENT_ROOT = previousAgentRoot;
    }
    if (workRoot) {
      rmSync(workRoot, { recursive: true, force: true });
      workRoot = "";
    }
  });

  it("stdout 行转发为 log 事件", () => {
    previousAgentRoot = process.env.STABILITY_ANALYSIS_AGENT_ROOT;
    process.env.STABILITY_ANALYSIS_AGENT_ROOT = SA_AGENT_ROOT;
    workRoot = mkdtempSync(path.join(os.tmpdir(), "ember-stability-event-"));
    setStabilityAnalysisResultsRoot(workRoot);
    setStabilityLlmConfigRoot(workRoot);
    saveStabilityLlmConfig({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat",
      apiKey: "sk-deepseek-test",
      configured: true,
    });

    const events: string[] = [];
    setStabilityAnalysisEventEmitter(({ line }) => {
      events.push(`${line.type}:${line.message}`);
    });

    const fakeChild = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof vi.fn>;
    };
    fakeChild.stdout = new EventEmitter();
    fakeChild.stderr = new EventEmitter();
    fakeChild.kill = vi.fn();
    setStabilityAnalysisSpawnForTests(() => fakeChild as never);

    startStabilityAnalysis({
      crashLogPath: __filename,
      scope: "parse_stack_only",
    });

    fakeChild.stdout.emit("data", "解析崩溃日志\n");
    expect(events.some((entry) => entry.includes("log:解析崩溃日志"))).toBe(true);
  });
});
