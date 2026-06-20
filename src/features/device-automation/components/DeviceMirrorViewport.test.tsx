import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
  resolveDeviceMirrorAspectRatio,
} from "./DeviceMirrorViewport";

describe("resolveDeviceMirrorAspectRatio", () => {
  it("使用设备真实宽/高比例", () => {
    expect(resolveDeviceMirrorAspectRatio(1080 / 2400)).toBeCloseTo(0.45, 3);
  });

  it("非法比例时回退默认竖屏比例", () => {
    expect(resolveDeviceMirrorAspectRatio(0)).toBe(
      DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
    );
    expect(resolveDeviceMirrorAspectRatio(Number.NaN)).toBe(
      DEFAULT_DEVICE_MIRROR_ASPECT_RATIO,
    );
  });
});
