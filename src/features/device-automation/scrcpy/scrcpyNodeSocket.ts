import {
  Consumable,
  ReadableStream,
  WritableStream,
  type ReadableWritablePair,
} from "@yume-chan/stream-extra";
import type { ScrcpyPreloadSocket } from "./scrcpyNodeTypes";

/** 对齐 aya screencast/lib/util.ts */
export function socketToReadableStream(
  socket: ScrcpyPreloadSocket,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      socket.on("data", (data) => {
        controller.enqueue(data as Uint8Array);
      });
      socket.on("end", () => {
        controller.close();
      });
      socket.on("error", (error) => {
        controller.error(error instanceof Error ? error : new Error(String(error)));
      });
    },
    cancel() {
      socket.destroy();
    },
  });
}

/** 对齐 aya screencast/lib/util.ts */
export function socketToWritableStream(
  socket: ScrcpyPreloadSocket,
): WritableStream<Consumable<Uint8Array>> {
  return new WritableStream<Consumable<Uint8Array>>({
    write(chunk) {
      return new Promise<void>((resolve, reject) => {
        socket.write(chunk.value, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
    close() {
      socket.end();
    },
    abort() {
      socket.destroy();
    },
  });
}

export function socketToReadableWritablePair(
  socket: ScrcpyPreloadSocket,
): ReadableWritablePair<Uint8Array, Consumable<Uint8Array>> {
  return {
    readable: socketToReadableStream(socket),
    writable: socketToWritableStream(socket),
  };
}
