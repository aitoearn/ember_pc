#!/usr/bin/env node

import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultOutputDir = path.resolve("dist-electron/device-automation");
const defaultSourceDir = path.resolve("resources/device-automation");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const perfTracePresetsSourceDir = path.join(
  repoRoot,
  "electron/deviceAutomation/perfTrace/presets",
);

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const result = await stageDeviceAutomationResources({
    outputDir: path.resolve(args.output ?? defaultOutputDir),
    sourceDir: path.resolve(args.source ?? defaultSourceDir),
    scrcpyServerPath: args["scrcpy-server-path"] ?? env.DEVICE_AUTOMATION_SCRCPY_SERVER_PATH,
    adbDir: args["adb-dir"] ?? env.DEVICE_AUTOMATION_ADB_DIR,
    agentDeviceRoot: args["agent-device-root"] ?? env.DEVICE_AUTOMATION_AGENT_DEVICE_ROOT,
  });

  if (result.missing.length > 0) {
    const message = `资源未完整暂存：${result.missing.join("；")}`;
    if (args.strict) {
      throw new Error(`设备自动化资源未完整暂存：${result.missing.join("；")}`);
    }
    console.warn(`[device-automation-assets] ${message}`);
  } else {
    console.log(`[device-automation-assets] 资源已暂存到 ${result.outputDir}`);
  }
  return result;
}

export async function stageDeviceAutomationResources({
  outputDir = defaultOutputDir,
  sourceDir = defaultSourceDir,
  scrcpyServerPath,
  adbDir,
  agentDeviceRoot,
} = {}) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    resources: {
      scrcpyServer: await stageScrcpyServer({
        outputDir,
        sourceDir,
        scrcpyServerPath,
      }),
      perfTracePresets: await stagePerfTracePresets({
        outputDir,
        sourceDir: perfTracePresetsSourceDir,
      }),
      adb: await stageAdb({ outputDir, sourceDir, adbDir }),
      fastbot: await stageFastbot({ outputDir, sourceDir }),
      agentDevice: await stageAgentDevice({ outputDir, agentDeviceRoot }),
    },
  };

  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const missing = Object.entries(manifest.resources)
    .filter(([name, resource]) => {
      if (name === "fastbot") {
        return false;
      }
      return resource.status !== "staged";
    })
    .map(([name, resource]) => `${name}: ${resource.reason}`);

  return { outputDir, manifest, missing };
}

async function stagePerfTracePresets({ outputDir, sourceDir }) {
  const targetDir = path.join(outputDir, "perfTrace", "presets");
  if (!existsSync(sourceDir)) {
    return {
      status: "missing",
      path: "perfTrace/presets",
      reason: `未找到 Perfetto 预设目录：${sourceDir}`,
    };
  }
  await mkdir(targetDir, { recursive: true });
  const presetFiles = (await readdir(sourceDir)).filter((name) => name.endsWith(".txt"));
  for (const name of presetFiles) {
    await cp(path.join(sourceDir, name), path.join(targetDir, name));
  }
  return { status: "staged", path: "perfTrace/presets", source: sourceDir };
}

async function stageScrcpyServer({ outputDir, sourceDir, scrcpyServerPath }) {
  const source = firstExistingFile([
    scrcpyServerPath,
    path.join(sourceDir, "scrcpy.jar"),
  ]);
  if (!source) {
    return {
      status: "missing",
      path: "scrcpy.jar",
      reason:
        "未找到 scrcpy.jar；请设置 DEVICE_AUTOMATION_SCRCPY_SERVER_PATH 或放到 resources/device-automation/scrcpy.jar",
    };
  }
  await cp(source, path.join(outputDir, "scrcpy.jar"));
  return { status: "staged", path: "scrcpy.jar", source };
}

async function stageAdb({ outputDir, sourceDir, adbDir }) {
  const source = firstExistingDirectory([
    adbDir,
    path.join(sourceDir, "adb"),
  ]);
  if (!source) {
    return {
      status: "missing",
      path: "adb",
      reason:
        "未找到 adb 资源目录；请设置 DEVICE_AUTOMATION_ADB_DIR 或放到 resources/device-automation/adb",
    };
  }
  await cp(source, path.join(outputDir, "adb"), { recursive: true });
  return { status: "staged", path: "adb", source };
}

async function stageFastbot({ outputDir, sourceDir }) {
  const source = firstExistingDirectory([path.join(sourceDir, "fastbot")]);
  if (!source) {
    return {
      status: "missing",
      path: "fastbot",
      reason:
        "未找到 Fastbot 资源目录；请将 Kea2 assets 复制到 resources/device-automation/fastbot/",
    };
  }
  await cp(source, path.join(outputDir, "fastbot"), { recursive: true });
  return { status: "staged", path: "fastbot", source };
}

async function stageAgentDevice({ outputDir, agentDeviceRoot }) {
  const root = firstExistingDirectory([
    agentDeviceRoot,
    path.resolve("../agent-device"),
    path.resolve("../../agent-device"),
  ]);
  if (!root) {
    return {
      status: "missing",
      path: "agent-device",
      reason: "未找到 agent-device 工程根目录",
    };
  }
  const dist = path.join(root, "dist");
  const bin = path.join(root, "bin");
  const packageJson = path.join(root, "package.json");
  const yamlDependency = path.join(root, "node_modules", "yaml");
  if (!existsSync(dist)) {
    return {
      status: "missing",
      path: "agent-device",
      source: root,
      reason: "agent-device 缺少 dist；请先在 sibling 仓库运行 pnpm build",
    };
  }
  if (!existsSync(yamlDependency)) {
    return {
      status: "missing",
      path: "agent-device",
      source: root,
      reason: "agent-device 缺少运行时依赖 yaml；请先在 sibling 仓库运行 pnpm install",
    };
  }
  await mkdir(path.join(outputDir, "agent-device"), { recursive: true });
  await cp(dist, path.join(outputDir, "agent-device", "dist"), {
    recursive: true,
  });
  await cp(bin, path.join(outputDir, "agent-device", "bin"), {
    recursive: true,
  });
  await cp(packageJson, path.join(outputDir, "agent-device", "package.json"));
  await cp(yamlDependency, path.join(outputDir, "agent-device", "node_modules", "yaml"), {
    recursive: true,
    dereference: true,
  });
  return {
    status: "staged",
    path: "agent-device",
    source: root,
    dependencies: ["yaml"],
  };
}

function firstExistingFile(candidates) {
  return candidates
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate))
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function firstExistingDirectory(candidates) {
  return candidates
    .filter(Boolean)
    .map((candidate) => path.resolve(candidate))
    .find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory());
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(`[device-automation-assets] ${error.message}`);
    process.exitCode = 1;
  });
}
