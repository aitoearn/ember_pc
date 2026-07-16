import {
  InsertableStreamVideoFrameRenderer,
  type WebCodecsVideoDecoder,
} from "@yume-chan/scrcpy-decoder-webcodecs";

/** 对齐 aya：video.decoder.renderer.element */
export function readScrcpyDecoderSurface(
  decoder: WebCodecsVideoDecoder,
): HTMLVideoElement {
  return (decoder as unknown as { renderer: InsertableStreamVideoFrameRenderer })
    .renderer.element;
}
