/**
 * 用例详情 / 编辑抽屉（US1）。
 *
 * 右侧滑出面板：编辑全部字段 + 动态步骤列表。保存前用 validateCase 做前端校验
 * （含 caseId 工作区内唯一），失败展示错误；后端唯一索引为最终保证。
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TEST_CASE_EXEC_RESULTS,
  TEST_CASE_PRIORITIES,
  TEST_CASE_SOURCES,
  TEST_CASE_STATUSES,
  TEST_CASE_TYPES,
  type TestCase,
  type TestCaseExecResult,
  type TestCaseModule,
  type TestCasePriority,
  type TestCaseSource,
  type TestCaseStatus,
  type TestCaseStep,
  type TestCaseType,
} from "../types";
import { validateCase } from "../viewModel/validateCase";

const UNASSIGNED_VALUE = "__unassigned__";

interface TestCaseDetailDrawerProps {
  open: boolean;
  initialCase: TestCase | null;
  modules: TestCaseModule[];
  existingCases: TestCase[];
  onClose: () => void;
  onSave: (testCase: TestCase) => void;
}

function tagsToText(tags: string[]): string {
  return tags.join(", ");
}

function textToTags(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function TestCaseDetailDrawer({
  open,
  initialCase,
  modules,
  existingCases,
  onClose,
  onSave,
}: TestCaseDetailDrawerProps) {
  const { t } = useTranslation("testCaseManagement");
  const [draft, setDraft] = useState<TestCase | null>(initialCase);
  const [tagsText, setTagsText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setDraft(initialCase);
    setTagsText(initialCase ? tagsToText(initialCase.tags) : "");
    setErrors([]);
  }, [initialCase]);

  if (!open || !draft) {
    return null;
  }

  const isEdit = existingCases.some((c) => c.id === draft.id);

  const update = (patch: Partial<TestCase>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateStep = (index: number, patch: Partial<TestCaseStep>) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = prev.steps.map((step, i) =>
        i === index ? { ...step, ...patch } : step,
      );
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = [
        ...prev.steps,
        { stepNo: prev.steps.length + 1, action: "", expected: "" },
      ];
      return { ...prev, steps };
    });
  };

  const removeStep = (index: number) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = prev.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepNo: i + 1 }));
      return { ...prev, steps };
    });
  };

  const updateAssertion = (index: number, value: string) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const assertions = prev.assertions.map((item, i) =>
        i === index ? value : item,
      );
      return { ...prev, assertions };
    });
  };

  const addAssertion = () => {
    setDraft((prev) =>
      prev ? { ...prev, assertions: [...prev.assertions, ""] } : prev,
    );
  };

  const removeAssertion = (index: number) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const assertions = prev.assertions.filter((_, i) => i !== index);
      return { ...prev, assertions };
    });
  };

  const handleSave = () => {
    const candidate: TestCase = {
      ...draft,
      tags: textToTags(tagsText),
      assertions: draft.assertions
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    };
    const validationErrors = validateCase(candidate, existingCases);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    onSave(candidate);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("testCaseManagement.action.close")}
        className="bg-foreground/20 absolute inset-0"
        onClick={onClose}
      />
      <div className="bg-background relative flex h-full w-full max-w-xl flex-col border-l shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            {isEdit
              ? t("testCaseManagement.drawer.editTitle")
              : t("testCaseManagement.drawer.createTitle")}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
          {errors.length > 0 ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">
                {t("testCaseManagement.validation.failed")}
              </p>
              <ul className="ml-4 list-disc">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("testCaseManagement.field.caseId")}>
              <Input
                value={draft.caseId}
                onChange={(event) => update({ caseId: event.target.value })}
              />
            </Field>
            <Field label={t("testCaseManagement.field.module")}>
              <Select
                value={draft.moduleId || UNASSIGNED_VALUE}
                onValueChange={(value) =>
                  update({ moduleId: value === UNASSIGNED_VALUE ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>
                    {t("testCaseManagement.module.unassigned")}
                  </SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("testCaseManagement.field.title")}>
            <Input
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("testCaseManagement.field.priority")}>
              <EnumSelect
                value={draft.priority}
                options={TEST_CASE_PRIORITIES}
                onChange={(priority: TestCasePriority) => update({ priority })}
              />
            </Field>
            <Field label={t("testCaseManagement.field.type")}>
              <EnumSelect
                value={draft.caseType}
                options={TEST_CASE_TYPES}
                onChange={(caseType: TestCaseType) => update({ caseType })}
              />
            </Field>
            <Field label={t("testCaseManagement.field.status")}>
              <EnumSelect
                value={draft.status}
                options={TEST_CASE_STATUSES}
                onChange={(status: TestCaseStatus) => update({ status })}
              />
            </Field>
            <Field label={t("testCaseManagement.field.source")}>
              <EnumSelect
                value={draft.source}
                options={TEST_CASE_SOURCES}
                onChange={(source: TestCaseSource) => update({ source })}
              />
            </Field>
          </div>

          <Field label={t("testCaseManagement.field.precondition")}>
            <Textarea
              value={draft.precondition}
              rows={2}
              onChange={(event) =>
                update({ precondition: event.target.value })
              }
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("testCaseManagement.field.steps")}</Label>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("testCaseManagement.step.add")}
              </Button>
            </div>
            {draft.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-md border p-2"
              >
                <span className="text-muted-foreground mt-2 w-5 text-center text-xs">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <Input
                    value={step.action}
                    placeholder={t("testCaseManagement.field.stepAction")}
                    onChange={(event) =>
                      updateStep(index, { action: event.target.value })
                    }
                  />
                  <Input
                    value={step.expected}
                    placeholder={t("testCaseManagement.field.stepExpected")}
                    onChange={(event) =>
                      updateStep(index, { expected: event.target.value })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1"
                  title={t("testCaseManagement.step.remove")}
                  onClick={() => removeStep(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("testCaseManagement.field.assertions")}</Label>
              <Button variant="outline" size="sm" onClick={addAssertion}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("testCaseManagement.assertion.add")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("testCaseManagement.field.assertionsHint")}
            </p>
            {draft.assertions.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                {t("testCaseManagement.assertion.empty")}
              </p>
            ) : null}
            {draft.assertions.map((assertion, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-md border p-2"
              >
                <span className="text-muted-foreground mt-2 w-5 text-center text-xs">
                  {index + 1}
                </span>
                <Input
                  className="flex-1"
                  value={assertion}
                  placeholder={t("testCaseManagement.field.assertionPlaceholder")}
                  onChange={(event) => updateAssertion(index, event.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1"
                  title={t("testCaseManagement.assertion.remove")}
                  onClick={() => removeAssertion(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("testCaseManagement.field.tags")}>
              <Input
                value={tagsText}
                placeholder={t("testCaseManagement.field.tagsPlaceholder")}
                onChange={(event) => setTagsText(event.target.value)}
              />
            </Field>
            <Field label={t("testCaseManagement.field.execResult")}>
              <EnumSelect
                value={draft.execResult}
                options={TEST_CASE_EXEC_RESULTS}
                onChange={(execResult: TestCaseExecResult) =>
                  update({ execResult })
                }
              />
            </Field>
          </div>

          <Field label={t("testCaseManagement.field.remark")}>
            <Textarea
              value={draft.remark}
              rows={2}
              onChange={(event) => update({ remark: event.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={onClose}>
            {t("testCaseManagement.action.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("testCaseManagement.action.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </div>
  );
}

interface EnumSelectProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

function EnumSelect<T extends string>({
  value,
  options,
  onChange,
}: EnumSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
