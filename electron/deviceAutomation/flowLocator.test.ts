import { describe, expect, it } from "vitest";

import { tryLocateLocators } from "./flowLocator";

const SAMPLE_XML = `
<hierarchy>
  <node index="0" text="设置" resource-id="com.android.settings:id/title" class="android.widget.TextView" package="com.android.settings" content-desc="" clickable="true" enabled="true" bounds="[100,200][300,280]" />
  <node index="1" text="" resource-id="com.example:id/btn_ok" class="android.widget.Button" package="com.example" content-desc="确定" clickable="true" enabled="true" bounds="[400,900][600,980]" />
</hierarchy>
`;

describe("flowLocator", () => {
  it("按 resource_id → text 优先级命中", () => {
    const hit = tryLocateLocators(
      [
        { kind: "resource_id", value: "com.example:id/btn_ok" },
        { kind: "text", value: "设置", match: "contains" },
      ],
      SAMPLE_XML,
      { width: 1080, height: 2400 },
    );
    expect("centerX" in hit).toBe(true);
    if ("centerX" in hit) {
      expect(hit.kind).toBe("resource_id");
      expect(hit.centerX).toBe(500);
      expect(hit.centerY).toBe(940);
    }
  });

  it("全部失配返回 reason", () => {
    const miss = tryLocateLocators(
      [{ kind: "text", value: "不存在", match: "exact" }],
      SAMPLE_XML,
      { width: 1080, height: 2400 },
    );
    expect(miss).toMatchObject({ ok: false, reason: "全部定位策略均未命中" });
  });
});
