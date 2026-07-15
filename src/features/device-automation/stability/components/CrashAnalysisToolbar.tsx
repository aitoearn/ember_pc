import { FolderOpen, Loader2, Play, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { open as openDialog } from "@/lib/desktop-host/plugin-dialog";
import type { CrashAnalysisFormState } from "../types";

export interface CrashAnalysisToolbarProps {
  form: CrashAnalysisFormState;
  toolAvailable: boolean;
  toolError?: string;
  toolLoading: boolean;
  isRunning: boolean;
  canStartFull: boolean;
  canStartParseOnly: boolean;
  onFormChange: (patch: Partial<CrashAnalysisFormState>) => void;
  onRefreshToolStatus: () => void;
  onStartFull: () => void;
  onStartParseOnly: () => void;
  onCancel: () => void;
}

export function CrashAnalysisToolbar({
  form,
  toolAvailable,
  toolError,
  toolLoading,
  isRunning,
  canStartFull,
  canStartParseOnly,
  onFormChange,
  onRefreshToolStatus,
  onStartFull,
  onStartParseOnly,
  onCancel,
}: CrashAnalysisToolbarProps) {
  const { t } = useTranslation("deviceAutomation");

  const pickCrashLog = async () => {
    const selected = await openDialog({
      title: t("deviceAutomation.stability.crash.pickCrashLog"),
      filters: [
        {
          name: t("deviceAutomation.stability.crash.logFilter"),
          extensions: ["txt", "log"],
        },
      ],
    });
    if (typeof selected === "string" && selected.trim()) {
      onFormChange({ crashLogPath: selected.trim() });
    }
  };

  const pickLibraryDir = async () => {
    const selected = await openDialog({
      title: t("deviceAutomation.stability.crash.pickLibraryDir"),
      directory: true,
    });
    if (typeof selected === "string" && selected.trim()) {
      onFormChange({ libraryDir: selected.trim() });
    }
  };

  const pickCodeRoot = async () => {
    const selected = await openDialog({
      title: t("deviceAutomation.stability.crash.pickCodeRoot"),
      directory: true,
    });
    if (typeof selected === "string" && selected.trim()) {
      onFormChange({ codeRoot: selected.trim() });
    }
  };

  return (
    <section
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid="crash-analysis-toolbar"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            {t("deviceAutomation.stability.crash.title")}
          </h3>
          <p className="mt-1 text-xs text-neutral-600">
            {t("deviceAutomation.stability.crash.description")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => void onRefreshToolStatus()}
          disabled={toolLoading || isRunning}
        >
          {toolLoading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" />
          )}
          {t("deviceAutomation.stability.crash.refreshTool")}
        </Button>
      </div>

      {!toolAvailable && !toolLoading ? (
        <div
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="stability-tool-unavailable"
        >
          <p className="font-medium">
            {t("deviceAutomation.stability.errors.toolUnavailableTitle")}
          </p>
          <p className="mt-1 text-amber-800/90">
            {toolError ||
              t("deviceAutomation.stability.errors.toolUnavailableDescription")}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <PathField
          id="crash-log-path"
          label={t("deviceAutomation.stability.crash.crashLogPath")}
          value={form.crashLogPath}
          placeholder={t("deviceAutomation.stability.crash.crashLogPlaceholder")}
          pickLabel={t("deviceAutomation.stability.crash.browseFile")}
          disabled={isRunning}
          onPick={() => void pickCrashLog()}
        />
        <PathField
          id="library-dir"
          label={t("deviceAutomation.stability.crash.libraryDir")}
          value={form.libraryDir}
          placeholder={t("deviceAutomation.stability.crash.libraryDirPlaceholder")}
          pickLabel={t("deviceAutomation.stability.crash.browseDir")}
          disabled={isRunning}
          onPick={() => void pickLibraryDir()}
        />
        <PathField
          id="code-root"
          label={t("deviceAutomation.stability.crash.codeRoot")}
          value={form.codeRoot}
          placeholder={t("deviceAutomation.stability.crash.codeRootPlaceholder")}
          pickLabel={t("deviceAutomation.stability.crash.browseDir")}
          disabled={isRunning}
          onPick={() => void pickCodeRoot()}
          optionalHint={t("deviceAutomation.stability.crash.codeRootOptional")}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isRunning ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void onCancel()}
          >
            <Square className="mr-1.5 size-3.5" />
            {t("deviceAutomation.stability.crash.cancel")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => void onStartFull()}
              disabled={!canStartFull}
              data-testid="crash-analysis-start-full"
            >
              <Play className="mr-1.5 size-3.5" />
              {t("deviceAutomation.stability.crash.startFull")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onStartParseOnly()}
              disabled={!canStartParseOnly}
              data-testid="crash-analysis-start-parse-only"
            >
              {t("deviceAutomation.stability.crash.startParseOnly")}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function PathField(props: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  pickLabel: string;
  disabled?: boolean;
  optionalHint?: string;
  onPick: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={props.id}>{props.label}</Label>
        {props.optionalHint ? (
          <span className="text-[11px] text-neutral-500">{props.optionalHint}</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Input
          id={props.id}
          value={props.value}
          readOnly
          placeholder={props.placeholder}
          disabled={props.disabled}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={props.onPick}
          disabled={props.disabled}
        >
          <FolderOpen className="mr-1.5 size-3.5" />
          {props.pickLabel}
        </Button>
      </div>
    </div>
  );
}
