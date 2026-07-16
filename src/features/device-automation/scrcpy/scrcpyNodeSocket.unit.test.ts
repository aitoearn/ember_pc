// @vitest-environment node
import { Consumable } from "@yume-chan/stream-extra";
import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { socketToReadableStream, socketToReadableWritablePair } from "./scrcpyNodeSocket";
import type { ScrcpyPreloadSocket } from "./scrcpyNodeTypes";

function createMockSocket(chunks: Uint8Array[] = []): ScrcpyPreloadSocket {
  const emitter = new EventEmitter();
  queueMicrotask(() => {
    for (const chunk of chunks) {
      emitter.emit("data", chunk);
    }
    emitter.emit("end");
  });
  return {
    on(event, listener) {
      emitter.on(event, listener);
    },
    write: vi.fn((_buffer, cb?: (err?: Error | null) => void) => {
      cb?.(null);
      return true;
    }),
    end: vi.fn(),
    destroy: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
}

describe("scrcpyNodeSocket", () => {
  it("socketToReadableStream 转发 data/end", async () => {
    const socket = createMockSocket([Uint8Array.from([9, 8, 7])]);
    const reader = socketToReadableStream(socket).getReader();
    await expect(reader.read()).resolves.toEqual({
      done: false,
      value: Uint8Array.from([9, 8, 7]),
    });
    await expect(reader.read()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });

  it("socketToReadableWritablePair 写流调用 socket.write", async () => {
    const socket = createMockSocket();
    const pair = socketToReadableWritablePair(socket);
    const writer = pair.writable.getWriter();
    await writer.write(new Consumable(new Uint8Array([1, 2])));
    expect(socket.write).toHaveBeenCalledWith(
      Uint8Array.from([1, 2]),
      expect.any(Function),
    );
  });
});
