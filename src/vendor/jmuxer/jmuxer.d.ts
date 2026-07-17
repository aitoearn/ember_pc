declare module "jmuxer" {
  interface JMuxerOptions {
    node: string | HTMLVideoElement;
    mode?: "video" | "audio" | "both";
    flushingTime?: number;
    fps?: number;
    readFpsFromTrack?: boolean;
    debug?: boolean;
    onReady?: () => void;
    onError?: (err: unknown) => void;
  }

  interface FeedData {
    video?: Uint8Array;
    audio?: Uint8Array;
    duration?: number;
  }

  class JMuxer {
    constructor(options: JMuxerOptions);
    feed(data: FeedData): void;
    destroy(): void;
    reset(): void;
  }

  export default JMuxer;
}
