import { describe, expect, it } from "vitest";
import { formatLineList, parseLineList } from "./exploreRuleDefaults";

describe("exploreRuleDefaults line lists", () => {
  it("按行解析并去空", () => {
    expect(parseLineList("a\n\n b \n")).toEqual(["a", "b"]);
    expect(formatLineList(["x", "y"])).toBe("x\ny");
  });
});
