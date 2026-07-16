import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AgentObservabilityPageParams,
  AgentObservabilityTab,
  Page,
  PageParams,
} from "@/types/page";
import { useAgentObservabilitySessions } from "./hooks/useAgentObservabilitySessions";
import { PhoenixTracingEmbed } from "./components/PhoenixTracingEmbed";
import { AgentSessionsPanel } from "./components/AgentSessionsPanel";

const TABS: AgentObservabilityTab[] = ["tracing", "sessions"];

export interface AgentObservabilityWorkspaceProps {
  pageParams?: AgentObservabilityPageParams;
  onNavigate?: (page: Page, params?: PageParams) => void;
}

export function AgentObservabilityWorkspace({
  pageParams,
  onNavigate,
}: AgentObservabilityWorkspaceProps) {
  const { t } = useTranslation("agentObservability");
  const activeTab = pageParams?.tab ?? "tracing";
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    pageParams?.sessionId ?? null,
  );

  const {
    sessions,
    sessionsLoading,
    sessionsError,
    reloadSessions,
    sessionDetail,
    detailLoading,
    detailError,
  } = useAgentObservabilitySessions(selectedSessionId);

  const tabLabels = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((tab) => [tab, t(`agentObservability.tabs.${tab}`)]),
      ) as Record<AgentObservabilityTab, string>,
    [t],
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6"
      data-testid="agent-observability-workspace"
    >
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("agentObservability.page.eyebrow")}
        </p>
        <h1 className="text-xl font-semibold">{t("agentObservability.page.title")}</h1>
        <p className="text-sm text-[color:var(--ember-text-muted,#6b6b66)]">
          {t("agentObservability.page.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeTab === tab
                ? "bg-[color:var(--ember-surface-muted,#f7f7f5)] font-medium"
                : "text-[color:var(--ember-text-muted,#6b6b66)] hover:bg-[color:var(--ember-surface-muted,#f7f7f5)]"
            }`}
            data-testid={`agent-observability-tab-${tab}`}
            onClick={() =>
              onNavigate?.("agent-observability", {
                tab,
                sessionId: selectedSessionId ?? undefined,
              })
            }
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "tracing" ? (
          <PhoenixTracingEmbed initialBaseUrl={pageParams?.phoenixBaseUrl} />
        ) : (
          <AgentSessionsPanel
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            onReload={() => void reloadSessions()}
            sessionDetail={sessionDetail}
            detailLoading={detailLoading}
            detailError={detailError}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}
