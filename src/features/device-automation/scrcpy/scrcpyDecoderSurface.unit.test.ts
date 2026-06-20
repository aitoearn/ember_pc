import { InsertableStreamVideoFrameRenderer } from "@yume-chan/scrcpy-decoder-webcodecs";
import { describe, expect, it } from "vitest";
import { readScrcpyDecoderSurface } from "./scrcpyDecoderSurface";

describe("scrcpyDecoderSurface", () => {
  it("对齐 aya：decoder.renderer.element", () => {
    const element = document.createElement("video");
    const renderer = Object.create(InsertableStreamVideoFrameRenderer.prototype);
    Object.defineProperty(renderer, "element", { value: element });
    const decoder = { renderer } as never;
    expect(readScrcpyDecoderSurface(decoder)).toBe(element);
  });
});
