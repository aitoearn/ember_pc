import { describe, expect, it } from "vitest";
import { runKea2UiDumpHeuristics } from "./uiDumpHeuristics";

const RN_BLANK_XML = `<hierarchy>
  <node resource-id="com.demo:id/ReactRootView" text="" content-desc="" bounds="[0,0][1080,1920]" />
  <node resource-id="android:id/content" text="" content-desc="" bounds="[0,0][1080,1920]" />
</hierarchy>`;

const NORMAL_XML = `<hierarchy>
  <node resource-id="com.demo:id/title" text="首页" content-desc="" bounds="[0,0][100,40]" />
  <node resource-id="com.demo:id/list" text="" content-desc="列表" bounds="[0,40][1080,1920]" />
</hierarchy>`;

describe("uiDumpHeuristics", () => {
  it("空 UI 树触发 empty_ui_tree", () => {
    const results = runKea2UiDumpHeuristics("", 1);
    expect(results.some((item) => item.ruleId === "kea2-builtin-empty_ui_tree")).toBe(true);
  });

  it("RN 稀疏树触发 rn_blank_heuristic", () => {
    const results = runKea2UiDumpHeuristics(RN_BLANK_XML, 3);
    expect(results.some((item) => item.ruleId === "kea2-builtin-rn_blank_heuristic")).toBe(true);
  });

  it("正常页面不触发启发式", () => {
    const results = runKea2UiDumpHeuristics(NORMAL_XML, 2);
    expect(results).toHaveLength(0);
  });
});
