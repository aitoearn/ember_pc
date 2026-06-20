import type {
  AgentEventCostEstimated,
  AgentEventCostRecorded,
  AgentEventWarning,
} from "@/lib/api/agentProtocol";
import type {
  AgentUiProjectionContext,
  AgentUiProjectionEvent,
} from "@embercloud/agent-ui-contracts";
import {
  buildAgentUiCostMetricEvent,
  buildAgentUiWarningEvent,
} from "@embercloud/agent-runtime-projection";

export function buildWarningEvent(
  event: AgentEventWarning,
  context: AgentUiProjectionContext,
): AgentUiProjectionEvent {
  return buildAgentUiWarningEvent(
    {
      sourceType: event.type,
      code: event.code,
      message: event.message,
    },
    context,
  );
}

export function buildCostMetricEvent(
  event: AgentEventCostEstimated | AgentEventCostRecorded,
  context: AgentUiProjectionContext,
): AgentUiProjectionEvent {
  return buildAgentUiCostMetricEvent(
    {
      sourceType: event.type,
      metricEvent: event.type,
      costState: event.cost_state,
    },
    context,
  );
}
