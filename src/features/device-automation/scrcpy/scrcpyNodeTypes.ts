/** preload ↔ renderer 共享的 scrcpy 直连 TCP 类型（对齐 aya share/preload/node.ts）。 */
export type ScrcpyPreloadSocket = {
  on(
    event: "data" | "end" | "error" | "close",
    listener: (...args: unknown[]) => void,
  ): void;
  write(buffer: Uint8Array, cb?: (err?: Error | null) => void): boolean;
  end(): void;
  destroy(): void;
  pause(): void;
  resume(): void;
};

export type ScrcpyPreloadServer = {
  listen(port?: number): Promise<number>;
  close(): void;
};

export type ScrcpyNodeBridgeApi = {
  createServer(listener: (socket: ScrcpyPreloadSocket) => void): ScrcpyPreloadServer;
};
