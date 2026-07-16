import { describe, expect, it } from "vitest";
import {
  parseStepsLogContent,
  summarizeStepsLog,
} from "./stepsLogParser";

describe("stepsLogParser", () => {
  it("解析 Monkey 与 ScriptInfo JSON 行", () => {
    const entries = parseStepsLogContent(
      [
        '{"Type":"Monkey","MonkeyStepsCount":"1","Info":"CLICK","Screenshot":"s1.png"}',
        '{"Type":"ScriptInfo","MonkeyStepsCount":"1","Info":"{\\"propName\\":\\"p1\\",\\"state\\":\\"pass\\"}"}',
        '{"Type":"Monkey","MonkeyStepsCount":"2","Info":"kill_apps"}',
      ].join("\n"),
    );
    expect(entries.length).toBe(3);
    expect(entries[0].type).toBe("Monkey");
    expect(entries[0].monkeyStepsCount).toBe(1);
    expect(entries[1].type).toBe("ScriptInfo");
    expect(entries[1].info).toEqual({ propName: "p1", state: "pass" });
    const summary = summarizeStepsLog(entries);
    expect(summary.monkeyStepCount).toBe(2);
    expect(summary.killAppsCount).toBe(1);
    expect(summary.lastMonkeyStep).toBe(2);
  });
});
