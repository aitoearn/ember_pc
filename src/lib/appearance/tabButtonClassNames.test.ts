import { describe, expect, it } from "vitest";
import {
  limeTabBadgeClassName,
  emberTabButtonClassName,
  limeTabButtonIconClassName,
} from "./tabButtonClassNames";

describe("tabButtonClassNames", () => {
  it("激活态 Tab 应使用 theme subtle/border/default", () => {
    expect(emberTabButtonClassName(true)).toContain("--theme-subtle");
    expect(emberTabButtonClassName(true)).toContain("--theme-border");
    expect(emberTabButtonClassName(true)).toContain("--theme-default");
  });

  it("未激活态 Tab 应保留 hover 语义", () => {
    expect(emberTabButtonClassName(false)).toContain("--theme-hover");
  });

  it("图标颜色应随激活态切换", () => {
    expect(limeTabButtonIconClassName(true)).toContain("--theme-default");
    expect(limeTabButtonIconClassName(false)).toContain("--ember-text-muted");
  });

  it("默认 Badge 应走主题色", () => {
    expect(limeTabBadgeClassName("default")).toContain("--theme-subtle");
    expect(limeTabBadgeClassName("default")).toContain("--theme-default");
  });
});
