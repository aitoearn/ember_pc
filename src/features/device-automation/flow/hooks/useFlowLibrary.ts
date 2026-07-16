/**
 * 测试流库 hook：列举 / 保存 / 删除，对齐 test-case-management store 风格。
 */

import { useCallback, useEffect, useState } from "react";
import { requireDefaultProjectId } from "@/lib/api/project";
import {
  deleteDeviceFlows,
  listDeviceFlows,
  readDeviceFlow,
  saveDeviceFlow,
} from "../api";
import type { TestFlow } from "../domain/flowFormat";

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useFlowLibrary() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<TestFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadForWorkspace = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const listed = await listDeviceFlows(id);
      setFlows(listed);
    } catch (loadError) {
      setError(toMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = await requireDefaultProjectId();
        if (cancelled) {
          return;
        }
        setWorkspaceId(id);
        await loadForWorkspace(id);
      } catch (resolveError) {
        if (!cancelled) {
          setError(toMessage(resolveError));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadForWorkspace]);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    await loadForWorkspace(workspaceId);
  }, [loadForWorkspace, workspaceId]);

  const selectFlow = useCallback(
    async (flowId: string | null) => {
      setSelectedFlowId(flowId);
      if (!flowId) {
        setSelectedFlow(null);
        return;
      }
      try {
        const flow = await readDeviceFlow(flowId);
        setSelectedFlow(flow);
      } catch (readError) {
        setError(toMessage(readError));
      }
    },
    [],
  );

  const saveFlow = useCallback(
    async (flow: TestFlow): Promise<TestFlow> => {
      const saved = await saveDeviceFlow(flow);
      await reload();
      if (selectedFlowId === saved.id) {
        setSelectedFlow(saved);
      }
      return saved;
    },
    [reload, selectedFlowId],
  );

  const removeFlows = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!workspaceId || ids.length === 0) {
        return 0;
      }
      const deleted = await deleteDeviceFlows(ids);
      if (selectedFlowId && ids.includes(selectedFlowId)) {
        setSelectedFlowId(null);
        setSelectedFlow(null);
      }
      await reload();
      return deleted;
    },
    [reload, selectedFlowId, workspaceId],
  );

  return {
    workspaceId,
    flows,
    selectedFlowId,
    selectedFlow,
    loading,
    error,
    reload,
    selectFlow,
    saveFlow,
    removeFlows,
  };
}
