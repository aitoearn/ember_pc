import { useCallback, useEffect, useState } from "react";
import {
  getAgentRuntimeSession,
  listAgentRuntimeSessions,
} from "@/lib/api/agentRuntime";
import type {
  AsterSessionDetail,
  AsterSessionInfo,
} from "@/lib/api/agentRuntime/types";

const SESSION_LIST_LIMIT = 80;

export function useAgentObservabilitySessions(selectedSessionId: string | null) {
  const [sessions, setSessions] = useState<AsterSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<AsterSessionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const reloadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const rows = await listAgentRuntimeSessions({
        limit: SESSION_LIST_LIMIT,
        includeArchived: false,
      });
      setSessions(rows);
    } catch (error) {
      console.error("加载 Agent 会话列表失败:", error);
      setSessionsError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [reloadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    void (async () => {
      try {
        const detail = await getAgentRuntimeSession(selectedSessionId, {
          historyLimit: 0,
        });
        if (!cancelled) {
          setSessionDetail(detail);
        }
      } catch (error) {
        console.error("加载 Agent 会话详情失败:", error);
        if (!cancelled) {
          setSessionDetail(null);
          setDetailError(
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  return {
    sessions,
    sessionsLoading,
    sessionsError,
    reloadSessions,
    sessionDetail,
    detailLoading,
    detailError,
  };
}
