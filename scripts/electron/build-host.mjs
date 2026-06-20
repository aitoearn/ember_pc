import { build } from "vite";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devMode = process.argv.includes("--dev");
const sharedExternal = ["electron", /^node:/];
const appServerClientSource = path.resolve(
  repoRoot,
  "packages/app-server-client/src/index.ts",
);

async function buildMain() {
  await build({
    configFile: false,
    resolve: {
      alias: [
        {
          find: "@embercloud/app-server-client",
          replacement: appServerClientSource,
        },
      ],
    },
    build: {
      target: "node22",
      ssr: "electron/main.ts",
      outDir: "dist-electron/main",
      emptyOutDir: true,
      rollupOptions: {
        external: sharedExternal,
        output: {
          entryFileNames: "main.js",
          format: "es",
        },
      },
    },
  });
}

async function buildPreload() {
  await build({
    configFile: false,
    build: {
      target: "node22",
      ssr: "electron/preload.ts",
      outDir: "dist-electron/preload",
      emptyOutDir: true,
      rollupOptions: {
        external: ["electron", /^node:/],
        output: {
          entryFileNames: "preload.cjs",
          format: "cjs",
        },
      },
    },
  });
}

async function stagePerfTracePresets() {
  const sourceDir = path.resolve(
    repoRoot,
    "electron/deviceAutomation/perfTrace/presets",
  );
  const outputDir = path.resolve(
    repoRoot,
    "dist-electron/device-automation/perf-trace/presets",
  );
  await mkdir(outputDir, { recursive: true });
  const presetFiles = ["scroll_jank.txt", "cold_start.txt", "cpu_sched.txt"];
  for (const fileName of presetFiles) {
    await cp(path.join(sourceDir, fileName), path.join(outputDir, fileName));
  }
}

await buildMain();
await buildPreload();
await stagePerfTracePresets();
