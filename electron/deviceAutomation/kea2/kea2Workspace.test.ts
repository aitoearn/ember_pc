import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeKea2GeneratedPropertyScript } from "./kea2Workspace";

describe("kea2Workspace codegen", () => {
  it("从 Explore 规则生成 Kea2 Python 性质脚本", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kea2-ws-"));
    const scriptPath = writeKea2GeneratedPropertyScript(dir, [
      {
        id: "rule-1",
        name: "首页标题",
        kind: "invariant",
        enabled: true,
        assertion: {
          locatorKind: "text",
          value: "首页",
          match: "contains",
          present: true,
        },
      },
    ]);
    expect(scriptPath).toContain("ember_generated_rules.py");
    const content = readFileSync(scriptPath!, "utf8");
    expect(content).toContain("@invariant");
    expect(content).toContain("textContains");
    expect(content).toContain("首页");
  });
});
