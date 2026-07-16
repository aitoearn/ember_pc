import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureAgentDeviceScreenshotViaDaemon,
  connectAgentDeviceScrcpyViaDaemon,
  listAgentDevicesViaDaemon,
  resetAgentDeviceDaemonHealthCacheForTests,
  sendAgentDeviceNavigationViaDaemon,
  sendAgentDevicePressViaDaemon,
  sendAgentDeviceSwipeViaDaemon,
  startAgentDeviceScrcpyViaDaemon,
  reverseAgentDeviceScrcpyTcpViaDaemon,
} from "./agentDeviceDaemonClient";
import { resetAgentDeviceSessionCacheForTests } from "./agentDeviceSession";

const tempDirs: string[] = [];

afterEach(() => {
  resetAgentDeviceSessionCacheForTests();
  resetAgentDeviceDaemonHealthCacheForTests();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("agentDeviceDaemonClient", () => {
  it("读取 daemon.json 并通过 HTTP JSON-RPC 获取设备列表", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: { request?: Record<string, any> } = {};
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          observed.request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: observed.request?.id,
              result: {
                ok: true,
                data: {
                  devices: [
                    {
                      platform: "android",
                      id: "emulator-5554",
                      name: "Pixel",
                      kind: "emulator",
                    },
                  ],
                },
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      const devices = await listAgentDevicesViaDaemon(stateDir);

      expect(devices).toEqual([
        {
          platform: "android",
          id: "emulator-5554",
          name: "Pixel",
          kind: "emulator",
        },
      ]);
      expect(observed.request?.method).toBe("agent_device.command");
      expect(observed.request?.params?.command).toBe("devices");
      expect(observed.request?.params?.token).toBe("local-secret");
      expect(observed.request?.params?.flags).toMatchObject({
        stateDir,
        daemonTransport: "http",
      });
    } finally {
      await close(server);
    }
  });

  it("截图前先 open 建立 session", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: Array<Record<string, any>> = [];
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          observed.push(rpcRequest);
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "screenshot"
                    ? { path: "/tmp/screen.png" }
                    : { session: "ember-device-automation" },
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      await expect(
        captureAgentDeviceScreenshotViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          outputPath: "/tmp/screen.png",
        }),
      ).resolves.toBe("/tmp/screen.png");

      expect(observed.map((request) => request.params.command)).toEqual([
        "open",
        "screenshot",
      ]);
      expect(observed[0]?.params).toMatchObject({
        positionals: [],
        flags: {
          platform: "android",
          serial: "emulator-5554",
        },
      });
    } finally {
      await close(server);
    }
  });

  it("通过 HTTP JSON-RPC 下发截图和触控命令", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: Array<Record<string, any>> = [];
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          observed.push(rpcRequest);
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "screenshot"
                    ? { path: "/tmp/screen.png" }
                    : {},
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      await expect(
        captureAgentDeviceScreenshotViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          outputPath: "/tmp/screen.png",
        }),
      ).resolves.toBe("/tmp/screen.png");
      await expect(
        sendAgentDeviceNavigationViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          action: "back",
        }),
      ).resolves.toBe(true);
      await expect(
        sendAgentDevicePressViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          x: 12,
          y: 34,
        }),
      ).resolves.toBe(true);
      await expect(
        sendAgentDeviceSwipeViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          x1: 1,
          y1: 2,
          x2: 3,
          y2: 4,
        }),
      ).resolves.toBe(true);

      expect(observed.map((request) => request.params.command)).toEqual([
        "open",
        "screenshot",
        "back",
        "press",
        "swipe",
      ]);
      expect(observed[1]?.params).toMatchObject({
        positionals: ["/tmp/screen.png"],
        flags: {
          platform: "android",
          serial: "emulator-5554",
          stateDir,
          daemonTransport: "http",
        },
      });
      expect(observed[3]?.params).toMatchObject({
        positionals: ["12", "34"],
        flags: {
          platform: "android",
          serial: "emulator-5554",
        },
      });
      expect(observed[4]?.params).toMatchObject({
        positionals: ["1", "2", "3", "4"],
        flags: {
          platform: "android",
          serial: "emulator-5554",
        },
      });
    } finally {
      await close(server);
    }
  });

  it("session 已存在时重复 open 视为 attach 成功", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    let openCount = 0;
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (rpcRequest.params.command === "open") {
            openCount += 1;
            if (openCount > 1) {
              response.writeHead(400, { "content-type": "application/json" });
              response.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: rpcRequest.id,
                  error: {
                    code: -32000,
                    message:
                      "Session already active. Close it first or pass a new --session name.",
                    data: { code: "INVALID_ARGS" },
                  },
                }),
              );
              return;
            }
          }
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "screenshot"
                    ? { path: "/tmp/screen.png" }
                    : {},
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      resetAgentDeviceSessionCacheForTests();
      await expect(
        captureAgentDeviceScreenshotViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          outputPath: "/tmp/screen.png",
        }),
      ).resolves.toBe("/tmp/screen.png");
      resetAgentDeviceSessionCacheForTests();
      await expect(
        captureAgentDeviceScreenshotViaDaemon(stateDir, {
          platform: "android",
          deviceId: "emulator-5554",
          outputPath: "/tmp/screen.png",
        }),
      ).resolves.toBe("/tmp/screen.png");

      expect(openCount).toBe(2);
    } finally {
      await close(server);
    }
  });

  it("会话绑定到其他设备时先关闭旧会话再切换重开", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: Array<Record<string, any>> = [];
    let openCount = 0;
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          observed.push(rpcRequest);
          if (rpcRequest.params.command === "open") {
            openCount += 1;
            // 首次 open 命中其他设备占用冲突，关闭旧会话后第二次 open 成功。
            if (openCount === 1) {
              response.writeHead(400, { "content-type": "application/json" });
              response.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: rpcRequest.id,
                  error: {
                    code: -32000,
                    message:
                      'Session "ember-device-automation" is already bound to android device "HBP AL00" (2NX0225211000873), but this request selected --serial=4GJBB25414005461.',
                    data: { code: "INVALID_ARGS" },
                  },
                }),
              );
              return;
            }
          }
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "scrcpy_reverse_tcp"
                    ? { port: 43210 }
                    : {},
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      await expect(
        reverseAgentDeviceScrcpyTcpViaDaemon(stateDir, {
          deviceId: "4GJBB25414005461",
          remote: "localabstract:scrcpy_17878c8b",
          localPort: 43210,
        }),
      ).resolves.toEqual({ port: 43210 });

      expect(observed.map((request) => request.params.command)).toEqual([
        "open",
        "close",
        "open",
        "scrcpy_reverse_tcp",
      ]);
      expect(openCount).toBe(2);
    } finally {
      await close(server);
    }
  });

  it("通过 HTTP JSON-RPC 下发 scrcpy reverse/start 命令", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: Array<Record<string, any>> = [];
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          observed.push(rpcRequest);
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "scrcpy_reverse_tcp"
                    ? { port: 43210 }
                    : { pid: 123, version: "3.1" },
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      await expect(
        reverseAgentDeviceScrcpyTcpViaDaemon(stateDir, {
          deviceId: "emulator-5554",
          remote: "localabstract:scrcpy_00000042",
          localPort: 43210,
        }),
      ).resolves.toEqual({ port: 43210 });
      await expect(
        startAgentDeviceScrcpyViaDaemon(stateDir, {
          deviceId: "emulator-5554",
          scid: "00000042",
          scrcpyServerPath: "/tmp/scrcpy.jar",
          maxSize: 1280,
          videoBitRate: 4_000_000,
          audio: false,
        }),
      ).resolves.toEqual({ pid: 123, version: "3.1" });

      expect(observed.map((request) => request.params.command)).toEqual([
        "open",
        "scrcpy_reverse_tcp",
        "scrcpy_start",
      ]);
      expect(observed[1]?.params.flags).toMatchObject({
        platform: "android",
        serial: "emulator-5554",
        remote: "localabstract:scrcpy_00000042",
        localPort: 43210,
      });
      expect(observed[2]?.params.flags).toMatchObject({
        platform: "android",
        serial: "emulator-5554",
        scid: "00000042",
        scrcpyServerPath: "/tmp/scrcpy.jar",
        maxSize: 1280,
        videoBitRate: 4_000_000,
        audio: false,
      });
    } finally {
      await close(server);
    }
  });

  it("scrcpy connect 单次 health 探测后连续下发 reverse/start", async () => {
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "ember-agent-device-daemon-"));
    tempDirs.push(stateDir);
    const observed: Array<Record<string, any>> = [];
    let healthChecks = 0;
    const server = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        healthChecks += 1;
        response.writeHead(200);
        response.end("ok");
        return;
      }
      if (request.method === "POST" && request.url === "/rpc") {
        const chunks: Buffer[] = [];
        request.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        request.on("end", () => {
          const rpcRequest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          observed.push(rpcRequest);
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: rpcRequest.id,
              result: {
                ok: true,
                data:
                  rpcRequest.params.command === "scrcpy_reverse_tcp"
                    ? { port: 43210 }
                    : { pid: 123, version: "3.1" },
              },
            }),
          );
        });
        return;
      }
      response.writeHead(404);
      response.end("not found");
    });

    try {
      const port = await listen(server);
      mkdirSync(stateDir, { recursive: true });
      writeFileSync(
        path.join(stateDir, "daemon.json"),
        JSON.stringify({
          httpPort: port,
          token: "local-secret",
          pid: process.pid,
          transport: "http",
        }),
      );

      await expect(
        connectAgentDeviceScrcpyViaDaemon(stateDir, {
          deviceId: "emulator-5554",
          remote: "localabstract:scrcpy_00000042",
          localPort: 43210,
          scid: "00000042",
          scrcpyServerPath: "/tmp/scrcpy.jar",
          maxSize: 1280,
          videoBitRate: 4_000_000,
          audio: false,
        }),
      ).resolves.toEqual({
        reverse: { port: 43210 },
        start: { pid: 123, version: "3.1" },
      });

      expect(healthChecks).toBe(1);
      expect(observed.map((request) => request.params.command)).toEqual([
        "open",
        "scrcpy_reverse_tcp",
        "scrcpy_start",
      ]);
    } finally {
      await close(server);
    }
  });
});

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("测试服务未返回端口");
  }
  return address.port;
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
