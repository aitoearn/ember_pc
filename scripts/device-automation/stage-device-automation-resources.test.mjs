import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "./stage-device-automation-resources.mjs";

describe("stage-device-automation-resources", () => {
  it("默认允许缺失可下载资源并写入 manifest", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ember-device-assets-"));
    const output = path.join(tempDir, "dist", "device-automation");
    const agentDeviceRoot = await createAgentDeviceFixture(tempDir);
    await expect(
      main([
        "--output",
        output,
        "--source",
        path.join(tempDir, "missing-resources"),
        "--agent-device-root",
        agentDeviceRoot,
      ]),
    ).resolves.toMatchObject({
      missing: expect.arrayContaining([
        expect.stringContaining("scrcpyServer:"),
        expect.stringContaining("adb:"),
      ]),
    });
    const manifest = JSON.parse(
      await readFile(path.join(output, "manifest.json"), "utf8"),
    );
    expect(manifest.resources.scrcpyServer.status).toBe("missing");
    expect(manifest.resources.adb.status).toBe("missing");
    expect(manifest.resources.agentDevice.status).toBe("staged");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("strict 模式下拒绝缺失资源", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ember-device-assets-"));
    const output = path.join(tempDir, "dist", "device-automation");
    const agentDeviceRoot = await createAgentDeviceFixture(tempDir);
    await expect(
      main([
        "--strict",
        "--output",
        output,
        "--source",
        path.join(tempDir, "missing-resources"),
        "--agent-device-root",
        agentDeviceRoot,
      ]),
    ).rejects.toThrow("设备自动化资源未完整暂存");
    await rm(tempDir, { recursive: true, force: true });
  });

  it("暂存 scrcpy、adb 与 agent-device 资源", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ember-device-assets-"));
    const output = path.join(tempDir, "dist", "device-automation");
    const source = path.join(tempDir, "resources", "device-automation");
    const agentDeviceRoot = await createAgentDeviceFixture(tempDir);
    await mkdir(path.join(source, "adb"), { recursive: true });
    await writeFile(path.join(source, "scrcpy.jar"), "scrcpy");
    await writeFile(path.join(source, "adb", "adb"), "adb");

    const result = await main([
      "--strict",
      "--output",
      output,
      "--source",
      source,
      "--agent-device-root",
      agentDeviceRoot,
    ]);

    expect(result.missing).toEqual([]);
    const manifest = JSON.parse(
      await readFile(path.join(output, "manifest.json"), "utf8"),
    );
    expect(manifest.resources.scrcpyServer.status).toBe("staged");
    expect(manifest.resources.adb.status).toBe("staged");
    expect(manifest.resources.agentDevice.status).toBe("staged");
    await rm(tempDir, { recursive: true, force: true });
  });
});

async function createAgentDeviceFixture(tempDir) {
  const root = path.join(tempDir, "agent-device");
  await mkdir(path.join(root, "dist", "src", "internal"), { recursive: true });
  await mkdir(path.join(root, "bin"), { recursive: true });
  await mkdir(path.join(root, "node_modules", "yaml"), { recursive: true });
  await writeFile(path.join(root, "dist", "src", "internal", "bin.js"), "bin");
  await writeFile(path.join(root, "bin", "agent-device.mjs"), "bin");
  await writeFile(path.join(root, "package.json"), "{}\n");
  await writeFile(path.join(root, "node_modules", "yaml", "package.json"), "{}\n");
  return root;
}
