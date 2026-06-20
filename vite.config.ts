/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import process from "node:process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import { readWorkspaceAppVersion } from "./scripts/app-version.mjs";

// ES 模块中获取 __dirname 的方式
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cargoWorkspaceVersion = readWorkspaceAppVersion(__dirname);
const appVersion =
  process.env.VITE_APP_VERSION?.trim() || cargoWorkspaceVersion || "unknown";
const liveProviderSmokeAllowed =
  isTruthyEnv(process.env.EMBER_ALLOW_LIVE_PROVIDER_SMOKE) ||
  isTruthyEnv(process.env.EMBER_REAL_API_TEST);

if (!process.env.VITE_APP_VERSION && cargoWorkspaceVersion) {
  process.env.VITE_APP_VERSION = cargoWorkspaceVersion;
}

function isTruthyEnv(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

// 将启动画面 logo 内联为 data URL，消除 Electron 两段式启动（原生启动画面 →
// 渲染页面）导航时 logo.png 二次加载导致的“图标先消失再出现”闪烁。
// 仅 Electron 渲染构建/开发时启用，Web 模式保持引用 ./logo.png 不增大首屏 HTML。
function inlineStartupLogoPlugin(rootDir: string): Plugin {
  const STARTUP_LOGO_SRC = 'src="./logo.png"';
  return {
    name: "ember-inline-startup-logo",
    transformIndexHtml(html) {
      if (!html.includes(STARTUP_LOGO_SRC)) {
        return html;
      }
      try {
        const logoBuffer = readFileSync(
          path.resolve(rootDir, "public/logo.png"),
        );
        const dataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        return html.replace(STARTUP_LOGO_SRC, `src="${dataUrl}"`);
      } catch (error) {
        // 读取失败时回退到相对路径，启动画面仍能显示（仅可能短暂闪烁）
        console.warn(
          `[vite] 内联启动 logo 失败，回退到 ./logo.png：${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return html;
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const forceOptimizeDeps =
    process.env.EMBER_VITE_FORCE_OPTIMIZE_DEPS?.trim() === "1";
  const isElectronRenderer =
    process.env.EMBER_ELECTRON_RENDERER?.trim() === "1" ||
    process.env.VITE_DEV_SERVER_URL !== undefined;
  const cacheDir = isElectronRenderer
    ? "node_modules/.vite-electron"
    : "node_modules/.vite-web";

  return {
    base: command === "build" && isElectronRenderer ? "./" : undefined,
    cacheDir,
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    plugins: [
      react({
        jsxRuntime: mode === "development" ? "automatic" : "automatic",
        jsxImportSource: "react",
        babel: {
          compact: true,
        },
      }),
      svgr(),
      ...(isElectronRenderer ? [inlineStartupLogoPlugin(__dirname)] : []),
    ],
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
        {
          find: "@embercloud/app-server-client",
          replacement: path.resolve(
            __dirname,
            "./packages/app-server-client/src/index.ts",
          ),
        },
        {
          find: "@embercloud/agent-runtime-client/sessionGateway",
          replacement: path.resolve(
            __dirname,
            "./packages/agent-runtime-client/src/sessionGateway.ts",
          ),
        },
        {
          find: "@embercloud/agent-runtime-client",
          replacement: path.resolve(
            __dirname,
            "./packages/agent-runtime-client/src/index.ts",
          ),
        },
        {
          find: "@embercloud/agent-ui-contracts",
          replacement: path.resolve(
            __dirname,
            "./packages/agent-ui-contracts/src/index.ts",
          ),
        },
        {
          find: "@embercloud/agent-runtime-projection",
          replacement: path.resolve(
            __dirname,
            "./packages/agent-runtime-projection/src/index.ts",
          ),
        },
        {
          find: "@embercloud/agent-runtime-ui",
          replacement: path.resolve(
            __dirname,
            "./packages/agent-runtime-ui/src/index.ts",
          ),
        },
      ],
    },
    optimizeDeps: {
      force: forceOptimizeDeps,
    },
    build: {
      chunkSizeWarningLimit: 12000,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          const isMixedImportWarning =
            warning.message.includes("dynamically imported by") &&
            warning.message.includes("also statically imported by");

          if (isMixedImportWarning) {
            return;
          }

          defaultHandler(warning);
        },
      },
    },
    clearScreen: false,
    server: {
      host: "127.0.0.1",
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ["**/ember-rs/**"],
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./scripts/setup-vitest-network-guard.ts"],
      exclude: [
        "**/node_modules/**",
        "**/tmp/ember-pnpm-frozen-node_modules/**",
        "**/dist/**",
        "**/ember-rs/target/**",
        ...(liveProviderSmokeAllowed ? [] : ["**/*.live.test.*"]),
      ],
    },
  };
});
