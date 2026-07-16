import {
  ScrcpyControlMessageWriter,
  ScrcpyOptions3_1,
  ScrcpyVideoCodecId,
  type ScrcpyVideoCodecId as ScrcpyVideoCodecIdType,
} from "@yume-chan/scrcpy";
import { ReadableStream } from "@yume-chan/stream-extra";
import {
  InsertableStreamVideoFrameRenderer,
  WebCodecsVideoDecoder,
} from "@yume-chan/scrcpy-decoder-webcodecs";
import {
  reverseDeviceAutomationScrcpyTcpPort,
  startDeviceAutomationScrcpy,
} from "@/lib/api/deviceAutomation";
import type { ScrcpyPreloadServer, ScrcpyPreloadSocket } from "./scrcpyNodeTypes";
import { getScrcpyNodeBridge } from "./scrcpyNodeBridge";
import { ScrcpyReadinessGate } from "./scrcpyReadiness";
import {
  socketToReadableStream,
  socketToReadableWritablePair,
} from "./scrcpyNodeSocket";

const CONTROL_SOCKET_DETECT_MS = 1_000;

export class ScrcpyDirectClientClosedError extends Error {
  constructor() {
    super("Scrcpy 直连会话已关闭");
    this.name = "ScrcpyDirectClientClosedError";
  }
}

export function isScrcpyDirectClientClosedError(error: unknown): boolean {
  return error instanceof ScrcpyDirectClientClosedError;
}

/** 对齐 aya ScrcpyClient.getVideo() 返回结构。 */
export type ScrcpyDirectVideoPresentation = {
  stream: ReadableStream<unknown>;
  metadata: Awaited<
    ReturnType<ScrcpyOptions3_1["parseVideoStreamMetadata"]>
  >["metadata"];
  decoder: WebCodecsVideoDecoder;
};

export type ScrcpyDirectControlPresentation = {
  controller: ScrcpyControlMessageWriter;
};

export type ScrcpyDirectStartParams = {
  deviceId: string;
  scid: string;
  remote: string;
  maxSize?: number;
  videoBitRate?: number;
  audio?: boolean;
  control?: boolean;
};

/**
 * 对齐 aya ScrcpyClient：reverseTcp → listen → startScrcpy；createVideo 只建 stream+decoder。
 */
export class ScrcpyDirectClient {
  readonly #options: ScrcpyOptions3_1;
  readonly #readiness = new ScrcpyReadinessGate();
  #server: ScrcpyPreloadServer | null = null;
  #decoder: WebCodecsVideoDecoder | null = null;
  #videoStream: ReadableStream<unknown> | null = null;
  #video: ScrcpyDirectVideoPresentation | null = null;
  #control: ScrcpyDirectControlPresentation | null = null;
  #closed = false;
  #hasVideo = false;
  #controlReady = false;

  constructor(private readonly params: ScrcpyDirectStartParams) {
    this.#options = new ScrcpyOptions3_1({
      scid: params.scid,
      maxSize: params.maxSize,
      videoBitRate: params.videoBitRate,
      audio: params.audio ?? false,
      control: params.control ?? true,
    });
    void this.#start().catch((error: unknown) => {
      console.error("[scrcpy] 会话启动失败:", error);
    });
  }

  async getVideo(): Promise<ScrcpyDirectVideoPresentation> {
    if (this.#closed) {
      throw new ScrcpyDirectClientClosedError();
    }
    await this.#readiness.wait("video");
    if (!this.#video) {
      throw new Error("Scrcpy 视频 presentation 未就绪");
    }
    return this.#video;
  }

  async getControl(): Promise<ScrcpyDirectControlPresentation> {
    if (this.#closed) {
      throw new ScrcpyDirectClientClosedError();
    }
    await this.#readiness.wait("control");
    if (!this.#control) {
      throw new Error("Scrcpy 控制 presentation 未就绪");
    }
    return this.#control;
  }

  get closed(): boolean {
    return this.#closed;
  }

  close(): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#server?.close();
    this.#server = null;
    this.#decoder?.dispose();
    this.#decoder = null;
    this.#videoStream = null;
    this.#video = null;
    this.#control = null;
    this.#readiness.reset();
  }

  async #start(): Promise<void> {
    const reversed = await reverseDeviceAutomationScrcpyTcpPort({
      deviceId: this.params.deviceId,
      remote: this.params.remote,
    });
    if (this.#closed) {
      throw new ScrcpyDirectClientClosedError();
    }

    const nodeBridge = getScrcpyNodeBridge();
    const server = nodeBridge.createServer((socket) => {
      this.#handleIncomingSocket(socket);
    });
    const port = await server.listen(reversed.port);
    this.#server = server;
    console.info(
      `[scrcpy] renderer TCP 监听 scid=${this.params.scid} 本地端口=${port}${reversed.reused ? "（复用 adb reverse）" : ""}`,
    );

    void startDeviceAutomationScrcpy({
      deviceId: this.params.deviceId,
      scid: this.params.scid,
      maxSize: this.params.maxSize,
      videoBitRate: this.params.videoBitRate,
      audio: this.params.audio ?? false,
    }).catch((error: unknown) => {
      console.error("[scrcpy] 启动设备端 server 失败:", error);
    });
  }

  #handleIncomingSocket(socket: ScrcpyPreloadSocket): void {
    if (this.#closed) {
      socket.destroy();
      return;
    }
    if (!this.#hasVideo) {
      this.#hasVideo = true;
      void this.#createVideo(socketToReadableStream(socket));
      socket.on("close", () => {
        if (!this.#closed) {
          console.warn("[scrcpy] 视频 socket 已关闭");
        }
      });
      return;
    }

    let isAudio = false;
    void this.#detectAudioStream(socketToReadableStream(socket)).then((detected) => {
      if (this.#closed) {
        return;
      }
      if (detected.audio) {
        isAudio = true;
        detected.stream.cancel().catch(() => {});
      }
    });

    globalThis.setTimeout(() => {
      if (!isAudio && !this.#closed && !this.#controlReady) {
        void this.#createControl(socketToReadableWritablePair(socket));
      }
    }, CONTROL_SOCKET_DETECT_MS);
  }

  async #createVideo(videoStream: ReadableStream<Uint8Array>): Promise<void> {
    try {
      console.info("[scrcpy] 视频 socket 已回连（renderer 直连）");
      const { stream, metadata } = await this.#options.parseVideoStreamMetadata(
        videoStream,
      );
      console.info(
        `[scrcpy] 视频元数据就绪 codec=${String(metadata.codec)} 宽=${metadata.width ?? "?"} 高=${metadata.height ?? "?"} `,
      );

      const decoder = this.#createDecoder(metadata.codec);
      this.#decoder = decoder;
      this.#videoStream = (stream as never as ReadableStream<unknown>).pipeThrough(
        this.#options.createMediaStreamTransformer() as never,
      );

      this.#video = {
        stream: this.#videoStream,
        metadata,
        decoder,
      };
      console.info("[scrcpy] 视频 presentation 就绪");
      this.#readiness.signal("video");
    } catch (error) {
      console.error("[scrcpy] 视频流初始化失败:", error);
    }
  }

  async #createControl(
    controlStream: ReturnType<typeof socketToReadableWritablePair>,
  ): Promise<void> {
    if (this.#controlReady || this.#closed) {
      return;
    }
    this.#controlReady = true;
    try {
      const writer = new ScrcpyControlMessageWriter(
        controlStream.writable.getWriter(),
        this.#options,
      );
      void controlStream.readable
        .pipeTo(
          new WritableStream({
            write() {},
          }) as never,
        )
        .catch(() => {});
      console.info("[scrcpy] 控制 socket 已就绪（renderer 直连）");
      this.#control = { controller: writer };
      this.#readiness.signal("control");
    } catch (error) {
      console.error("[scrcpy] 控制流初始化失败:", error);
    }
  }

  #createDecoder(codec: ScrcpyVideoCodecIdType): WebCodecsVideoDecoder {
    if (!WebCodecsVideoDecoder.isSupported) {
      throw new Error("WebCodecs 不可用");
    }
    if (!InsertableStreamVideoFrameRenderer.isSupported) {
      throw new Error("InsertableStream 视频渲染不可用");
    }
    let resolvedCodec: ScrcpyVideoCodecIdType = ScrcpyVideoCodecId.H264;
    switch (codec) {
      case ScrcpyVideoCodecId.H264:
        resolvedCodec = ScrcpyVideoCodecId.H264;
        break;
      case ScrcpyVideoCodecId.H265:
        resolvedCodec = ScrcpyVideoCodecId.H265;
        break;
      default:
        console.warn(`[scrcpy] 未显式处理的 codec=${String(codec)}，回退 H264`);
        resolvedCodec = ScrcpyVideoCodecId.H264;
        break;
    }
    const renderer = new InsertableStreamVideoFrameRenderer();
    return new WebCodecsVideoDecoder({ codec: resolvedCodec, renderer });
  }

  async #detectAudioStream(stream: ReadableStream<Uint8Array>): Promise<{
    audio: boolean;
    stream: ReadableStream<Uint8Array>;
  }> {
    const reader = stream.getReader();
    const first = await reader.read();
    if (first.done || !first.value || first.value.byteLength < 4) {
      await reader.cancel().catch(() => {});
      return { audio: false, stream };
    }
    const header = first.value.subarray(0, 4);
    const codecValue =
      ((header[0]! & 0xff) << 24) |
      ((header[1]! & 0xff) << 16) |
      ((header[2]! & 0xff) << 8) |
      (header[3]! & 0xff);
    const isAudio = codecValue === 0 || codecValue === 0x4f_50_55_53;
    const replay = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first.value!);
      },
      async pull(controller) {
        const next = await reader.read();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(next.value);
      },
      cancel(reason) {
        return reader.cancel(reason);
      },
    });
    if (!isAudio) {
      await reader.releaseLock();
    }
    return { audio: isAudio, stream: replay };
  }
}

export type { ScrcpyVideoCodecIdType as ScrcpyVideoCodecId };
