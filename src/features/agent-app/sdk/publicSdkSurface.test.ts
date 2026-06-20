import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import {
  EMBER_AGENT_APP_BRIDGE_PROTOCOL,
  EMBER_AGENT_APP_BRIDGE_VERSION,
  EMBER_CAPABILITY_DEFINITIONS,
  EMBER_CAPABILITY_NAMES,
  applyEmberHostTheme,
  createEmberCoreCapabilityAdapters,
  createLimeHostBridgeCapabilityInvoker,
  isLimeCapabilityErrorCode,
  normalizeLimeCapabilityErrorCode,
  syncEmberHostTheme,
} from "./index";
import * as publicSdkSurface from "./index";

const publicSdkSource = readFileSync(
  path.resolve(process.cwd(), "src/features/agent-app/sdk/index.ts"),
  "utf8",
);

describe("agent app SDK public surface", () => {
  it("只导出 App package 需要的 SDK facade 和 Host Bridge client", () => {
    expect(EMBER_AGENT_APP_BRIDGE_PROTOCOL).toBe("ember.agentApp.bridge");
    expect(EMBER_AGENT_APP_BRIDGE_VERSION).toBe(1);
    expect(EMBER_CAPABILITY_NAMES).toContain("ember.agent");
    expect(EMBER_CAPABILITY_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "ember.models" }),
        expect.objectContaining({ name: "ember.skills" }),
        expect.objectContaining({ name: "ember.usage" }),
      ]),
    );
    expect(isLimeCapabilityErrorCode("permission_denied")).toBe(true);
    expect(normalizeLimeCapabilityErrorCode("missing")).toBe("upstream_failed");
    expect(typeof createEmberCoreCapabilityAdapters).toBe("function");
    expect(typeof createLimeHostBridgeCapabilityInvoker).toBe("function");
    expect(typeof applyEmberHostTheme).toBe("function");
    expect(typeof syncEmberHostTheme).toBe("function");
    expect(publicSdkSurface).not.toHaveProperty(
      "createMockLimeCapabilityTransport",
    );
    expect(publicSdkSurface).not.toHaveProperty("MockCapabilityHost");
    expect(publicSdkSurface).not.toHaveProperty("buildMockCapabilityProfile");
  });

  it("不导出客户端 UI、安装器或 runtime host 内部实现", () => {
    expect(publicSdkSurface).not.toHaveProperty("AgentAppsPage");
    expect(publicSdkSurface).not.toHaveProperty("AgentAppRuntimePage");
    expect(publicSdkSurface).not.toHaveProperty("buildInstalledAppPreview");
    expect(publicSdkSurface).not.toHaveProperty(
      "LocalInstalledAgentAppStateRepository",
    );
    expect(publicSdkSurface).not.toHaveProperty("AgentRuntimeCapabilityHost");
    expect(publicSdkSurface).not.toHaveProperty("WorkflowRuntimeHost");
    expect(publicSdkSurface).not.toHaveProperty(
      "createAgentAppCapabilityDispatcher",
    );
  });

  it("源码层不从 UI、安装、运行时或 adapter 内部层转导出", () => {
    expect(publicSdkSource).not.toMatch(/from "\.\.\/ui\//);
    expect(publicSdkSource).not.toMatch(/from "\.\.\/install\//);
    expect(publicSdkSource).not.toMatch(/from "\.\.\/runtime\//);
    expect(publicSdkSource).not.toMatch(/from "\.\.\/adapters\//);
    expect(publicSdkSource).not.toMatch(/from "\.\.\/schema\//);
  });
});
