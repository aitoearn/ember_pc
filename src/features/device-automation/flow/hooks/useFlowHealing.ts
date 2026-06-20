/**
 * 自愈修订列举与处置 hook。
 */

import { useCallback, useEffect, useState } from "react";
import {
  listDeviceFlowHealing,
  resolveDeviceFlowHealing,
  type HealingResolution,
} from "../api";
import type { HealingRevision, TestFlow } from "../domain/flowFormat";

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useFlowHealing(flowId: string | null) {
  const [revisions, setRevisions] = useState<HealingRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!flowId) {
      setRevisions([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await listDeviceFlowHealing(flowId, "pending");
      setRevisions(list);
    } catch (loadError) {
      setError(toMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resolve = useCallback(
    async (
      id: string,
      resolution: HealingResolution,
    ): Promise<{ revision: HealingRevision; flow: TestFlow | null }> => {
      const result = await resolveDeviceFlowHealing(id, resolution);
      await reload();
      return result;
    },
    [reload],
  );

  return { revisions, loading, error, reload, resolve };
}
