import net from "node:net";
import type {
  ScrcpyPreloadServer,
  ScrcpyPreloadSocket,
} from "../../src/features/device-automation/scrcpy/scrcpyNodeTypes.ts";

export type { ScrcpyPreloadServer, ScrcpyPreloadSocket };

export function createScrcpyPreloadServer(
  listener: (socket: ScrcpyPreloadSocket) => void,
): ScrcpyPreloadServer {
  const server = net.createServer((socket) => {
    listener({
      on(event, handler) {
        socket.on(event, handler);
      },
      write(buffer, cb) {
        return socket.write(buffer, cb);
      },
      end() {
        socket.end();
      },
      destroy() {
        socket.destroy();
      },
      pause() {
        socket.pause();
      },
      resume() {
        socket.resume();
      },
    });
  });

  return {
    listen(port = 0) {
      return new Promise<number>((resolve, reject) => {
        server.once("error", reject);
        server.listen({ port, host: "127.0.0.1", reuseAddr: true }, () => {
          server.removeListener("error", reject);
          const address = server.address();
          if (!address || typeof address === "string") {
            reject(new Error("无法获取 scrcpy TCP 监听端口"));
            return;
          }
          resolve(address.port);
        });
      });
    },
    close() {
      server.close();
    },
  };
}

export const scrcpyNodeBridge = {
  createServer: createScrcpyPreloadServer,
};
