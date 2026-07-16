import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type {
  DeviceAutomationExecutionMode,
  DeviceAutomationPerceptionKernel,
} from "../domain/workbenchPresentation";

interface DeviceAutomationExecutionBarProps {
  executionMode: DeviceAutomationExecutionMode;
  perceptionKernel: DeviceAutomationPerceptionKernel;
  onExecutionModeChange: (mode: DeviceAutomationExecutionMode) => void;
  onPerceptionKernelChange: (kernel: DeviceAutomationPerceptionKernel) => void;
  disabled?: boolean;
}

function ModeToggle<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-medium text-neutral-500">{label}</p>
      <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              value === option.value
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800",
              disabled && "cursor-not-allowed opacity-60",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DeviceAutomationExecutionBar({
  executionMode,
  perceptionKernel,
  onExecutionModeChange,
  onPerceptionKernelChange,
  disabled = false,
}: DeviceAutomationExecutionBarProps) {
  const { t } = useTranslation("deviceAutomation");

  return (
    <div className="shrink-0 border-b border-neutral-100 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <ModeToggle
            label={t("deviceAutomation.debug.executionMode.label")}
            value={executionMode}
            disabled={disabled}
            options={[
              {
                value: "flexible",
                label: t("deviceAutomation.debug.executionMode.flexible"),
              },
              {
                value: "strict",
                label: t("deviceAutomation.debug.executionMode.strict"),
              },
            ]}
            onChange={onExecutionModeChange}
          />
          <ModeToggle
            label={t("deviceAutomation.debug.perception.label")}
            value={perceptionKernel}
            disabled={disabled}
            options={[
              {
                value: "ui-tree",
                label: t("deviceAutomation.debug.perception.uiTree"),
              },
              {
                value: "vision",
                label: t("deviceAutomation.debug.perception.vision"),
              },
              {
                value: "hybrid",
                label: t("deviceAutomation.debug.perception.hybrid"),
              },
            ]}
            onChange={onPerceptionKernelChange}
          />
        </div>
        <p className="max-w-md text-[11px] leading-5 text-neutral-500">
          {t("deviceAutomation.debug.perceptionHint")}
        </p>
      </div>
    </div>
  );
}
