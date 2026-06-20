/**
 * 回放前等待 UI 沉降：dump 内容在 stabilizeMs 内保持稳定，或超时失败。
 */

export interface FlowWaitParams {
  stabilizeMs: number;
  timeoutMs: number;
  pollMs?: number;
  captureDump: () => Promise<string>;
}

export type FlowWaitResult =
  | { ok: true; waitedMs: number }
  | { ok: false; reason: "timeout" | "dump_error"; message: string };

export async function waitForUiStable(params: FlowWaitParams): Promise<FlowWaitResult> {
  const pollMs = params.pollMs ?? 200;
  const startedAt = Date.now();
  let stableSince: number | null = null;
  let lastDump: string | null = null;

  while (Date.now() - startedAt < params.timeoutMs) {
    try {
      const dump = await params.captureDump();
      if (lastDump !== null && dump === lastDump) {
        if (stableSince === null) {
          stableSince = Date.now();
        }
        if (Date.now() - stableSince >= params.stabilizeMs) {
          return { ok: true, waitedMs: Date.now() - startedAt };
        }
      } else {
        lastDump = dump;
        stableSince = null;
      }
    } catch (error) {
      return {
        ok: false,
        reason: "dump_error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    await sleep(pollMs);
  }

  return {
    ok: false,
    reason: "timeout",
    message: `等待 UI 稳定超时（${params.timeoutMs}ms）`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
