import { CrashAnalysisResultPanel } from "./CrashAnalysisResultPanel";
import { CrashAnalysisToolbar } from "./CrashAnalysisToolbar";
import { StabilityLlmConfigSection } from "./StabilityLlmConfigSection";
import { useCrashAnalysis } from "../hooks/useCrashAnalysis";
import { useStabilityLlmConfig } from "../hooks/useStabilityLlmConfig";
import type { CrashAnalysisPrefill } from "../types";

export interface CrashAnalysisPanelProps {
  prefill?: CrashAnalysisPrefill | null;
}

export function CrashAnalysisPanel({ prefill }: CrashAnalysisPanelProps) {
  const llm = useStabilityLlmConfig();
  const analysis = useCrashAnalysis({
    prefill,
    llmConfigured: llm.isConfigured,
  });

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="crash-analysis-panel"
    >
      <StabilityLlmConfigSection
        draft={llm.draft}
        loading={llm.loading}
        saving={llm.saving}
        isConfigured={llm.isConfigured}
        onDraftChange={llm.updateDraft}
        onSave={() => void llm.save()}
      />
      <CrashAnalysisToolbar
        form={analysis.form}
        toolAvailable={analysis.toolStatus.available}
        toolError={analysis.toolStatus.error}
        toolLoading={analysis.toolLoading}
        isRunning={analysis.isRunning}
        canStartFull={analysis.canStartFull}
        canStartParseOnly={analysis.canStartParseOnly}
        onFormChange={analysis.updateForm}
        onRefreshToolStatus={() => void analysis.refreshToolStatus()}
        onStartFull={() => void analysis.start("full")}
        onStartParseOnly={() => void analysis.start("parse_stack_only")}
        onCancel={() => void analysis.cancel()}
      />
      <CrashAnalysisResultPanel
        viewState={analysis.viewState}
        reportMarkdown={analysis.reportMarkdown}
        reportLoading={analysis.reportLoading}
      />
    </div>
  );
}
