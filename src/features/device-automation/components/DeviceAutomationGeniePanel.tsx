import { useState, useEffect } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ImageIcon,
  Loader2,
  Play,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProviderWithKeysDisplay } from "@/lib/api/apiKeyProvider";
import {
  DEVICE_AUTOMATION_EXAMPLE_PROMPT_KEYS,
  type DeviceAutomationExecutionMode,
  type DeviceAutomationPerceptionKernel,
} from "../domain/workbenchPresentation";
import type { DeviceAutomationGenieStep } from "../types";
import { DeviceAutomationExecutionBar } from "./DeviceAutomationExecutionBar";

interface DeviceAutomationGeniePanelProps {
  steps: DeviceAutomationGenieStep[];
  running: boolean;
  aiReady: boolean;
  error: string | null;
  finalMessage: string | null;
  unavailable?: boolean;
  executionMode: DeviceAutomationExecutionMode;
  perceptionKernel: DeviceAutomationPerceptionKernel;
  onExecutionModeChange: (mode: DeviceAutomationExecutionMode) => void;
  onPerceptionKernelChange: (kernel: DeviceAutomationPerceptionKernel) => void;
  onSubmit: (instruction: string) => Promise<void>;
  onCancel: () => Promise<void>;
  providers: ProviderWithKeysDisplay[];
  selectedProviderId: string;
  onProviderChange: (providerId: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  /** 有可保存的流草稿步数（US1 保存为流）。 */
  flowDraftStepCount?: number;
  /** 从步骤推断的默认应用包名。 */
  defaultFlowAppPackage?: string;
  onSaveAsFlow?: (name: string, appPackage?: string) => Promise<void>;
}

/** 单步卡片：时间轴节点 + 折叠的思考过程 / 执行动作（移植自 lmweb StepCard，ember 设计语言）。 */
function StepCard({
  step,
  isLast,
}: {
  step: DeviceAutomationGenieStep;
  isLast: boolean;
}) {
  const { t } = useTranslation("deviceAutomation");
  const [thoughtOpen, setThoughtOpen] = useState(step.status !== "pending");
  const [actionOpen, setActionOpen] = useState(step.status !== "pending");

  return (
    <div className="relative">
      {!isLast ? (
        <div className="absolute bottom-0 left-[9px] top-[26px] w-px bg-neutral-200" />
      ) : null}

      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          {step.status === "completed" ? (
            <CheckCircle2 className="size-[18px] text-[#7c3aed]" />
          ) : null}
          {step.status === "running" ? (
            <Loader2 className="size-[18px] animate-spin text-[#7c3aed]" />
          ) : null}
          {step.status === "pending" ? (
            <div className="flex size-[18px] items-center justify-center rounded-full border-2 border-neutral-300">
              <span className="text-[10px] font-medium text-neutral-400">
                {step.index}
              </span>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 pb-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[13px] font-semibold text-neutral-900">
              {t("deviceAutomation.debug.aiStepLabel", { index: step.index })}
            </span>
            {step.status === "completed" && step.duration != null ? (
              <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                <Clock className="size-3" />
                {step.duration}s
              </span>
            ) : null}
            {step.status === "running" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7c3aed]">
                <span className="size-1 animate-pulse rounded-full bg-[#7c3aed]" />
                {t("deviceAutomation.debug.stepRunning")}
              </span>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              {step.thought ? (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setThoughtOpen(!thoughtOpen)}
                    className="group mb-1.5 flex cursor-pointer items-center gap-1.5"
                  >
                    <div className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5">
                      <Brain className="size-3 text-[#7c3aed]" />
                      <span className="text-[11px] font-medium text-[#7c3aed]">
                        {t("deviceAutomation.debug.stepThought")}
                      </span>
                    </div>
                    {thoughtOpen ? (
                      <ChevronDown className="size-3.5 text-neutral-400 group-hover:text-neutral-600" />
                    ) : (
                      <ChevronRight className="size-3.5 text-neutral-400 group-hover:text-neutral-600" />
                    )}
                  </button>
                  {thoughtOpen ? (
                    <p className="m-0 pl-0.5 text-[12.5px] leading-[1.7] text-neutral-600">
                      {step.thought}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step.action ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setActionOpen(!actionOpen)}
                    className="group mb-1.5 flex cursor-pointer items-center gap-1.5"
                  >
                    <div className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5">
                      <Play className="size-3 text-sky-600" />
                      <span className="text-[11px] font-medium text-sky-700">
                        {t("deviceAutomation.debug.stepAction")}
                      </span>
                    </div>
                    {actionOpen ? (
                      <ChevronDown className="size-3.5 text-neutral-400 group-hover:text-neutral-600" />
                    ) : (
                      <ChevronRight className="size-3.5 text-neutral-400 group-hover:text-neutral-600" />
                    )}
                  </button>
                  {actionOpen ? (
                    <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 font-mono text-[12px] leading-relaxed text-neutral-700">
                      {step.action}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step.status === "pending" && !step.thought && !step.action ? (
                <p className="m-0 text-[12px] text-neutral-400">{step.desc}</p>
              ) : null}
            </div>

            {step.screenshot ? (
              <div className="shrink-0">
                <div className="mb-1.5 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5">
                  <ImageIcon className="size-3 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-700">
                    {t("deviceAutomation.debug.stepScreenshot")}
                  </span>
                </div>
                <a
                  href={step.screenshot}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-[10px] border border-neutral-200 bg-neutral-50"
                  title={t("deviceAutomation.debug.stepScreenshot")}
                >
                  <img
                    src={step.screenshot}
                    alt={t("deviceAutomation.debug.stepScreenshot")}
                    className="h-auto w-[104px] object-contain"
                  />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeviceAutomationGeniePanel({
  steps,
  running,
  aiReady,
  error,
  finalMessage,
  unavailable = false,
  executionMode,
  perceptionKernel,
  onExecutionModeChange,
  onPerceptionKernelChange,
  onSubmit,
  onCancel,
  providers,
  selectedProviderId,
  onProviderChange,
  model,
  onModelChange,
  flowDraftStepCount = 0,
  defaultFlowAppPackage = "",
  onSaveAsFlow,
}: DeviceAutomationGeniePanelProps) {
  const { t } = useTranslation("deviceAutomation");
  const [instruction, setInstruction] = useState("");
  const [flowName, setFlowName] = useState("");
  const [flowAppPackage, setFlowAppPackage] = useState("");
  const [savingFlow, setSavingFlow] = useState(false);

  useEffect(() => {
    if (flowDraftStepCount > 0 && defaultFlowAppPackage) {
      setFlowAppPackage((prev) => (prev.trim() ? prev : defaultFlowAppPackage));
    }
  }, [defaultFlowAppPackage, flowDraftStepCount]);

  const handleSubmit = async () => {
    const value = instruction.trim();
    if (!value || running || !aiReady || unavailable) {
      return;
    }
    setInstruction("");
    await onSubmit(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          {t("deviceAutomation.debug.panelTitle")}
        </h3>
        {/* 模型选择：Provider + 模型名（凭证由 Host 注入，不经渲染层） */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedProviderId}
            onChange={(event) => onProviderChange(event.target.value)}
            disabled={unavailable || running}
            className="h-7 max-w-[120px] rounded-md border border-neutral-200 bg-white px-2 text-[11px] text-neutral-700 outline-none focus:border-[#7c3aed] disabled:opacity-50"
            aria-label={t("deviceAutomation.debug.providerLabel")}
          >
            <option value="">{t("deviceAutomation.debug.providerAuto")}</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <Input
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={unavailable || running}
            placeholder="qwen3.7-plus"
            className="h-7 w-[130px] bg-white text-[11px]"
            aria-label={t("deviceAutomation.debug.modelLabel")}
          />
        </div>
      </div>

      <DeviceAutomationExecutionBar
        executionMode={executionMode}
        perceptionKernel={perceptionKernel}
        onExecutionModeChange={onExecutionModeChange}
        onPerceptionKernelChange={onPerceptionKernelChange}
        disabled={unavailable || running}
      />

      {unavailable ? (
        <div className="mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <span>{t("deviceAutomation.debug.aiUnavailable")}</span>
        </div>
      ) : !aiReady ? (
        <div className="mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          <Loader2 className="size-4 animate-spin" />
          {error ?? t("deviceAutomation.debug.aiPreparing")}
        </div>
      ) : null}

      {error && aiReady ? (
        <div className="mx-4 mt-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {steps.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-[#7c3aed]">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-medium text-neutral-800">
              {t("deviceAutomation.debug.panelTitle")}
            </p>
            <p className="mt-2 max-w-md text-xs leading-5 text-neutral-500">
              {t(
                unavailable
                  ? "deviceAutomation.debug.panelDescriptionUnavailable"
                  : "deviceAutomation.debug.panelDescription",
              )}
            </p>
            <p className="mt-3 text-xs text-neutral-400">
              {t(
                unavailable
                  ? "deviceAutomation.debug.aiUnavailableEmptySteps"
                  : "deviceAutomation.debug.aiEmptySteps",
              )}
            </p>
            <div className="mt-4 w-full max-w-lg text-left">
              <p className="mb-2 text-[11px] font-medium text-neutral-500">
                {t("deviceAutomation.debug.examplePrompts")}
              </p>
              <div className="flex flex-wrap gap-2">
                {DEVICE_AUTOMATION_EXAMPLE_PROMPT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={unavailable || !aiReady || running}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-[11px] leading-5 text-neutral-600 transition-colors hover:border-[#7c3aed] hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setInstruction(t(key))}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {steps.map((step, index) => (
              <StepCard
                key={step.index}
                step={step}
                isLast={index === steps.length - 1}
              />
            ))}
            {finalMessage ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {finalMessage}
              </div>
            ) : null}
            {flowDraftStepCount > 0 && onSaveAsFlow ? (
              <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/80 p-3">
                <p className="text-xs text-violet-800">
                  {t("deviceAutomation.flow.record.draftReady", {
                    count: flowDraftStepCount,
                  })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={flowName}
                    onChange={(event) => setFlowName(event.target.value)}
                    placeholder={t("deviceAutomation.flow.record.namePlaceholder")}
                    className="h-8 max-w-xs bg-white text-sm"
                    disabled={savingFlow || running}
                  />
                  <Input
                    value={flowAppPackage}
                    onChange={(event) => setFlowAppPackage(event.target.value)}
                    placeholder={t(
                      "deviceAutomation.flow.record.appPackagePlaceholder",
                    )}
                    className="h-8 max-w-xs bg-white text-sm"
                    disabled={savingFlow || running}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    disabled={
                      savingFlow ||
                      running ||
                      !flowName.trim() ||
                      !flowAppPackage.trim()
                    }
                    onClick={() => {
                      void (async () => {
                        setSavingFlow(true);
                        try {
                          await onSaveAsFlow(
                            flowName.trim(),
                            flowAppPackage.trim(),
                          );
                          setFlowName("");
                          setFlowAppPackage("");
                        } finally {
                          setSavingFlow(false);
                        }
                      })();
                    }}
                  >
                    {savingFlow
                      ? t("deviceAutomation.flow.record.saving")
                      : t("deviceAutomation.flow.record.saveAsFlow")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <p className="mb-2 text-[11px] text-amber-700">
          {t(
            unavailable
              ? "deviceAutomation.debug.aiInputHintUnavailable"
              : "deviceAutomation.debug.aiInputHint",
          )}
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={t("deviceAutomation.debug.aiInputPlaceholder")}
            className="h-9 flex-1 bg-white text-sm"
            disabled={!aiReady || running || unavailable}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
          {running ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label={t("deviceAutomation.debug.aiCancel")}
              onClick={() => {
                void onCancel();
              }}
            >
              <Square className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 border-0 bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            disabled={!aiReady || running || unavailable || !instruction.trim()}
            aria-label={t("deviceAutomation.debug.aiSend")}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
