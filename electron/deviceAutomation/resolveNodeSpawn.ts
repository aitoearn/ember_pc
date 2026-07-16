import { spawnSync } from "node:child_process";

export type NodeSpawnPlan = {
  command: string;
  env: NodeJS.ProcessEnv;
};

function findNodeOnPath(): string | null {
  const lookup = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(lookup, ["node"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    return null;
  }
  const firstLine = result.stdout
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ?? null;
}

/**
 * 解析用于子进程 CLI 的 Node 可执行文件。
 * Electron 主进程的 process.execPath 不是 Node；需显式找 Node 或对 Electron 设 ELECTRON_RUN_AS_NODE。
 */
export function resolveNodeSpawn(options?: {
  requireRealNode?: boolean;
}): NodeSpawnPlan {
  const baseEnv = { ...process.env };
  const configured = process.env.DEVICE_AUTOMATION_NODE?.trim();
  if (configured) {
    return { command: configured, env: baseEnv };
  }

  const npmNode = process.env.npm_node_execpath?.trim();
  if (npmNode) {
    return { command: npmNode, env: baseEnv };
  }

  const pathNode = findNodeOnPath();
  if (pathNode) {
    return { command: pathNode, env: baseEnv };
  }

  if (options?.requireRealNode) {
    throw new Error(
      "未找到 Node 可执行文件。请先在 agent-device 工程执行 pnpm build，或设置 DEVICE_AUTOMATION_NODE。",
    );
  }

  return {
    command: process.execPath,
    env: {
      ...baseEnv,
      ELECTRON_RUN_AS_NODE: "1",
    },
  };
}
