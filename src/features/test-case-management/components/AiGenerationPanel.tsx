/**
 * AI 用例生成面板（US2）。
 *
 * 右侧滑出：输入源（粘贴文本 / 上传 md·txt·json）→ 选模型 → 可选数量/类型 →
 * 生成草稿 → 逐条勾选/编辑标题与编号/删除 → 批量入库（source=AI生成、status=草稿）。
 * docx/pdf/URL 输入源本期降级（见执行计划 us2-defer）。
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { ModelSelector } from "@/components/input-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateTestCases } from "../aiGeneration";
import { parseAiDrafts } from "../viewModel/aiDraftParse";
import type { TestCase } from "../types";

const ACCEPTED_FILE_EXT = ".md,.markdown,.txt,.json,.text";

export interface AiGenerationPanelProps {
  open: boolean;
  workspaceId: string;
  /** 当前选中模块，作为生成草稿的默认归属 */
  moduleId: string;
  onClose: () => void;
  onImport: (drafts: TestCase[]) => Promise<void> | void;
}

export function AiGenerationPanel({
  open,
  workspaceId,
  moduleId,
  onClose,
  onImport,
}: AiGenerationPanelProps) {
  const { t } = useTranslation("testCaseManagement");
  const [providerType, setProviderType] = useState("");
  const [model, setModel] = useState("");
  const [requirementText, setRequirementText] = useState("");
  const [fileName, setFileName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [drafts, setDrafts] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  if (!open) {
    return null;
  }

  const resetResults = () => {
    setDrafts([]);
    setSelectedIds(new Set());
    setWarning("");
    setError("");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      setRequirementText(text);
      setFileName(file.name);
      setError("");
    } catch (readError) {
      setError(
        readError instanceof Error ? readError.message : String(readError),
      );
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    resetResults();
    try {
      const raw = await generateTestCases({
        workspaceId,
        providerType,
        model,
        requirementText,
      });
      const result = parseAiDrafts(raw, { moduleId });
      setDrafts(result.drafts);
      setSelectedIds(new Set(result.drafts.map((draft) => draft.id)));
      setWarning(result.warning);
      if (result.drafts.length === 0 && !result.warning) {
        setWarning(t("testCaseManagement.ai.emptyResult"));
      }
    } catch (genError) {
      setError(genError instanceof Error ? genError.message : String(genError));
    } finally {
      setGenerating(false);
    }
  };

  const toggleDraft = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const updateDraft = (id: string, patch: Partial<TestCase>) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectedDrafts = drafts.filter((draft) => selectedIds.has(draft.id));

  const handleImport = async () => {
    if (selectedDrafts.length === 0) {
      return;
    }
    setImporting(true);
    try {
      await onImport(selectedDrafts);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("testCaseManagement.action.close")}
        className="bg-foreground/20 absolute inset-0"
        onClick={onClose}
      />
      <div className="bg-background relative flex h-full w-full max-w-2xl flex-col border-l shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("testCaseManagement.ai.title")}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
          <div className="space-y-1">
            <Label>{t("testCaseManagement.ai.model")}</Label>
            <ModelSelector
              className="w-full"
              providerType={providerType}
              setProviderType={setProviderType}
              model={model}
              setModel={setModel}
              activeTheme="general"
              popoverSide="bottom"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>{t("testCaseManagement.ai.input")}</Label>
              <label className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs">
                <Upload className="h-3.5 w-3.5" />
                {t("testCaseManagement.ai.upload")}
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_FILE_EXT}
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {fileName ? (
              <p className="text-muted-foreground text-xs">
                {t("testCaseManagement.ai.fileLoaded", { name: fileName })}
              </p>
            ) : null}
            <Textarea
              rows={6}
              value={requirementText}
              placeholder={t("testCaseManagement.ai.inputPlaceholder")}
              onChange={(event) => setRequirementText(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {t("testCaseManagement.ai.uploadHint")}
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {warning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {warning}
            </div>
          ) : null}

          {drafts.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {t("testCaseManagement.ai.draftCount", {
                    count: drafts.length,
                  })}
                </Label>
                <span className="text-muted-foreground text-xs">
                  {t("testCaseManagement.ai.selectedCount", {
                    count: selectedDrafts.length,
                  })}
                </span>
              </div>
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-start gap-2 rounded-md border p-2"
                >
                  <Checkbox
                    className="mt-2"
                    checked={selectedIds.has(draft.id)}
                    onCheckedChange={(checked) =>
                      toggleDraft(draft.id, checked === true)
                    }
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{draft.priority}</Badge>
                      <Badge variant="outline">{draft.caseType}</Badge>
                      <Input
                        className="h-7 flex-1"
                        value={draft.title}
                        onChange={(event) =>
                          updateDraft(draft.id, { title: event.target.value })
                        }
                      />
                    </div>
                    <Input
                      className="h-7"
                      value={draft.caseId}
                      placeholder={t("testCaseManagement.field.caseId")}
                      onChange={(event) =>
                        updateDraft(draft.id, { caseId: event.target.value })
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      {t("testCaseManagement.ai.draftSummary", {
                        steps: draft.steps.length,
                        assertions: draft.assertions.length,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-1"
                    title={t("testCaseManagement.action.delete")}
                    onClick={() => removeDraft(draft.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating || !requirementText.trim()}
          >
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {t("testCaseManagement.ai.generate")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selectedDrafts.length === 0}
          >
            {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {t("testCaseManagement.ai.import", { count: selectedDrafts.length })}
          </Button>
        </div>
      </div>
    </div>
  );
}
