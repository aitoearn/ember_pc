/**
 * Kea2 工作区工程：init、探索配置同步、性质脚本 codegen。
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { ExploreConfig, ExploreRule } from "../../../src/features/device-automation/explore/types";
import {
  buildKea2PythonEnv,
  resolveKea2PythonCommand,
  resolveKea2ToolRoot,
} from "./kea2Tool";

export function resolveKea2WorkspaceProjectDir(
  workspacesRoot: string,
  workspaceId: string,
): string {
  const safeId = workspaceId.trim() || "default";
  return path.join(workspacesRoot, safeId);
}

export function ensureKea2WorkspaceProject(
  workspacesRoot: string,
  workspaceId: string,
): { projectDir: string; initialized: boolean } {
  const projectDir = resolveKea2WorkspaceProjectDir(workspacesRoot, workspaceId);
  mkdirSync(path.join(projectDir, "properties"), { recursive: true });
  mkdirSync(path.join(projectDir, "output"), { recursive: true });

  const versionFile = path.join(projectDir, "configs", "version.json");
  if (existsSync(versionFile)) {
    return { projectDir, initialized: false };
  }

  const toolRoot = resolveKea2ToolRoot();
  if (!toolRoot) {
    throw new Error("未找到 Kea2 工具根目录，请设置 KEA2_ROOT");
  }

  const python = resolveKea2PythonCommand(toolRoot);
  const initResult = spawnSync(
    python,
    ["-m", "kea2", "init"],
    {
      cwd: projectDir,
      env: buildKea2PythonEnv(toolRoot),
      encoding: "utf8",
      timeout: 120_000,
    },
  );
  if (initResult.status !== 0) {
    throw new Error(
      `Kea2 init 失败：${initResult.stderr || initResult.stdout || `exit=${initResult.status}`}`,
    );
  }

  return { projectDir, initialized: true };
}

export function syncExploreConfigFiles(
  projectDir: string,
  exploreConfig: ExploreConfig,
): void {
  const configsDir = path.join(projectDir, "configs");
  mkdirSync(configsDir, { recursive: true });
  writeFileSync(
    path.join(configsDir, "awl.strings"),
    `${exploreConfig.actWhitelist.join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(configsDir, "abl.strings"),
    `${exploreConfig.actBlacklist.join("\n")}\n`,
    "utf8",
  );
}

export function writeKea2GeneratedPropertyScript(
  projectDir: string,
  rules: ExploreRule[],
): string | null {
  const enabled = rules.filter((rule) => rule.enabled);
  if (enabled.length === 0) {
    return null;
  }
  const scriptPath = path.join(projectDir, "properties", "ember_generated_rules.py");
  mkdirSync(path.dirname(scriptPath), { recursive: true });
  writeFileSync(scriptPath, generateKea2PropertyScript(enabled), "utf8");
  return scriptPath;
}

export function listKea2PropertyScripts(projectDir: string): string[] {
  const propertiesDir = path.join(projectDir, "properties");
  if (!existsSync(propertiesDir)) {
    return [];
  }
  return readdirSync(propertiesDir)
    .filter((name) => name.endsWith(".py"))
    .sort();
}

function generateKea2PropertyScript(rules: ExploreRule[]): string {
  const lines: string[] = [
    "# 由 Ember Explore 规则自动生成，供 Kea2 propertytest 加载。",
    "import unittest",
    "from kea2 import precondition, invariant",
    "",
    "",
    "class EmberGeneratedExploreRules(unittest.TestCase):",
    '    """Ember 工作区 Explore 规则 → Kea2 性质/不变量。"""',
    "",
  ];

  for (const rule of rules) {
    const methodName = toPythonMethodName(rule.name, rule.id);
    if (rule.kind === "invariant") {
      lines.push("    @invariant");
      lines.push(`    def ${methodName}(self):`);
      lines.push(`        """${escapePyString(rule.name)}"""`);
      lines.push(buildAssertionBody(rule));
      lines.push("");
    } else {
      lines.push("    @precondition(lambda self: True)");
      lines.push(`    def ${methodName}(self):`);
      lines.push(`        """property: ${escapePyString(rule.name)}"""`);
      lines.push(buildAssertionBody(rule));
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildAssertionBody(rule: ExploreRule): string {
  const assertion = rule.assertion;
  const locator = assertion.locatorKind;
  const value = escapePyString(assertion.value);
  const match = assertion.match ?? "contains";
  if (locator === "text") {
    if (assertion.present) {
      return match === "exact"
        ? `        assert self.d(text="${value}").exists`
        : `        assert self.d(textContains="${value}").exists`;
    }
    return match === "exact"
      ? `        assert not self.d(text="${value}").exists`
      : `        assert not self.d(textContains="${value}").exists`;
  }
  if (locator === "resource_id") {
    return assertion.present
      ? `        assert self.d(resourceId="${value}").exists`
      : `        assert not self.d(resourceId="${value}").exists`;
  }
  if (locator === "accessibility_id") {
    return assertion.present
      ? `        assert self.d(description="${value}").exists`
      : `        assert not self.d(description="${value}").exists`;
  }
  return "        pass  # 暂不支持的 locator，请在 properties/ 手写 Kea2 脚本";
}

function toPythonMethodName(name: string, id: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return `test_${slug || "rule"}_${suffix}`;
}

function escapePyString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function resolveKea2SessionOutputDir(
  projectDir: string,
  sessionId: string,
): string {
  return path.join(projectDir, "output", sessionId);
}

export function findKea2ResultDir(outputDir: string): string | null {
  if (!existsSync(outputDir)) {
    return null;
  }
  const entries = readdirSync(outputDir, { withFileTypes: true });
  const resDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("res_"))
    .map((entry) => path.join(outputDir, entry.name))
    .sort();
  return resDirs.at(-1) ?? outputDir;
}
