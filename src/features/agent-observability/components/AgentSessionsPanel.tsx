import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AsterSessionDetail, AsterSessionInfo } from "@/lib/api/agentRuntime/types";
import type { Page, PageParams } from "@/types/page";

function formatTimestamp(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) {
    return "—";
  }
  const ms = value > 1e12 ? value : value * 1000;
  return new Date(ms).toLocaleString();
}

export interface AgentSessionsPanelProps {
  sessions: AsterSessionInfo[];
  loading: boolean;
  error: string | null;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onReload: () => void;
  sessionDetail: AsterSessionDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onNavigate?: (page: Page, params?: PageParams) => void;
}

export function AgentSessionsPanel({
  sessions,
  loading,
  error,
  selectedSessionId,
  onSelectSession,
  onReload,
  sessionDetail,
  detailLoading,
  detailError,
  onNavigate,
}: AgentSessionsPanelProps) {
  const { t } = useTranslation("agentObservability");

  const threadRead = sessionDetail?.thread_read;
  const diagnostics = threadRead?.diagnostics;

  const summaryCards = useMemo(() => {
    if (!threadRead) {
      return [];
    }
    return [
      {
        label: t("agentObservability.sessions.metric.status"),
        value: threadRead.status ?? "—",
      },
      {
        label: t("agentObservability.sessions.metric.warnings"),
        value: diagnostics?.warning_count ?? 0,
      },
      {
        label: t("agentObservability.sessions.metric.pending"),
        value: diagnostics?.pending_request_count ?? 0,
      },
      {
        label: t("agentObservability.sessions.metric.failedTools"),
        value: diagnostics?.failed_tool_call_count ?? 0,
      },
    ];
  }, [diagnostics, threadRead, t]);

  const openInChat = () => {
    if (!selectedSessionId || !onNavigate) {
      return;
    }
    onNavigate("agent", {
      initialSessionId: selectedSessionId,
      projectId: sessionDetail?.workspace_id,
      agentEntry: "claw",
    });
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row"
      data-testid="agent-observability-sessions"
    >
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)]">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--ember-surface-border,#ececea)] px-4 py-3">
          <h3 className="text-sm font-medium">
            {t("agentObservability.sessions.listTitle")}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={onReload}>
            {t("agentObservability.sessions.reload")}
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("agentObservability.sessions.loading")}
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-red-600">{error}</p>
        ) : sessions.length === 0 ? (
          <p className="p-4 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("agentObservability.sessions.empty")}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[color:var(--ember-surface-border,#ececea)] overflow-auto">
            {sessions.map((session) => {
              const active = session.id === selectedSessionId;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[color:var(--ember-surface-muted,#f7f7f5)] ${
                      active ? "bg-[color:var(--ember-surface-muted,#f7f7f5)]" : ""
                    }`}
                    onClick={() => onSelectSession(session.id)}
                    data-testid={`agent-observability-session-${session.id}`}
                  >
                    <p className="truncate text-sm font-medium">
                      {session.name?.trim() || session.id}
                    </p>
                    <p className="mt-1 truncate text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                      {session.model ?? t("agentObservability.sessions.noModel")} ·{" "}
                      {formatTimestamp(session.updated_at)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex min-h-[320px] flex-1 flex-col rounded-xl border border-[color:var(--ember-surface-border,#ececea)] bg-[color:var(--ember-surface,#ffffff)]">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--ember-surface-border,#ececea)] px-4 py-3">
          <h3 className="text-sm font-medium">
            {t("agentObservability.sessions.detailTitle")}
          </h3>
          {selectedSessionId ? (
            <Button type="button" variant="outline" size="sm" onClick={openInChat}>
              <MessageSquareText className="mr-1 h-3.5 w-3.5" />
              {t("agentObservability.sessions.openChat")}
            </Button>
          ) : null}
        </div>

        {!selectedSessionId ? (
          <p className="p-4 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            {t("agentObservability.sessions.selectHint")}
          </p>
        ) : detailLoading ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("agentObservability.sessions.detailLoading")}
          </div>
        ) : detailError ? (
          <p className="p-4 text-sm text-red-600">{detailError}</p>
        ) : sessionDetail ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.field.sessionId")}
                </dt>
                <dd className="font-mono text-xs">{sessionDetail.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.field.workspace")}
                </dt>
                <dd>{sessionDetail.workspace_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.field.messages")}
                </dt>
                <dd>{sessionDetail.messages_count ?? sessionDetail.messages?.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.field.updatedAt")}
                </dt>
                <dd>{formatTimestamp(sessionDetail.updated_at)}</dd>
              </div>
            </dl>

            {summaryCards.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border border-[color:var(--ember-surface-border,#ececea)] px-3 py-2"
                  >
                    <p className="text-xs text-[color:var(--ember-text-muted,#6b6b66)]">
                      {card.label}
                    </p>
                    <p className="mt-1 text-sm font-medium">{card.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {diagnostics?.primary_blocking_summary ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {diagnostics.primary_blocking_summary}
              </div>
            ) : null}

            {threadRead?.telemetry_summary ? (
              <div>
                <p className="mb-2 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.telemetryTitle")}
                </p>
                <pre className="max-h-40 overflow-auto rounded-md bg-[color:var(--ember-surface-muted,#f7f7f5)] p-3 text-xs">
                  {JSON.stringify(threadRead.telemetry_summary, null, 2)}
                </pre>
              </div>
            ) : null}

            {threadRead?.runtime_summary ? (
              <div>
                <p className="mb-2 text-xs font-medium text-[color:var(--ember-text-muted,#6b6b66)]">
                  {t("agentObservability.sessions.runtimeTitle")}
                </p>
                <pre className="max-h-48 overflow-auto rounded-md bg-[color:var(--ember-surface-muted,#f7f7f5)] p-3 text-xs">
                  {JSON.stringify(threadRead.runtime_summary, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
