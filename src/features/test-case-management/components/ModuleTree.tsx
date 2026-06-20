/**
 * 模块树（US1）。
 *
 * 展示「全部用例」根入口 + 模块层级，支持新建 / 重命名 / 删除模块。删除非空模块
 * 由后端拒绝，这里在前端先做拦截提示，避免无谓往返。
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TestCase, TestCaseModule } from "../types";
import {
  buildModuleTree,
  type TestCaseModuleNode,
} from "../viewModel/groupByModule";

interface ModuleTreeProps {
  modules: TestCaseModule[];
  cases: TestCase[];
  selectedModuleId: string | null;
  onSelect: (moduleId: string | null) => void;
  onCreateModule: (name: string, parentId: string | null) => void;
  onRenameModule: (module: TestCaseModule, name: string) => void;
  onDeleteModule: (node: TestCaseModuleNode) => void;
}

interface DraftState {
  parentId: string | null;
  value: string;
}

export function ModuleTree({
  modules,
  cases,
  selectedModuleId,
  onSelect,
  onCreateModule,
  onRenameModule,
  onDeleteModule,
}: ModuleTreeProps) {
  const { t } = useTranslation("testCaseManagement");
  const tree = buildModuleTree(modules, cases);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const submitDraft = () => {
    if (!draft) {
      return;
    }
    const name = draft.value.trim();
    if (name) {
      onCreateModule(name, draft.parentId);
    }
    setDraft(null);
  };

  const submitRename = (module: TestCaseModule) => {
    const name = renameValue.trim();
    if (name && name !== module.name) {
      onRenameModule(module, name);
    }
    setRenamingId(null);
  };

  const renderNode = (node: TestCaseModuleNode, depth: number) => {
    const isSelected = selectedModuleId === node.module.id;
    const isRenaming = renamingId === node.module.id;
    return (
      <div key={node.module.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/60 text-foreground",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isRenaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={() => submitRename(node.module)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitRename(node.module);
                } else if (event.key === "Escape") {
                  setRenamingId(null);
                }
              }}
              className="h-7"
            />
          ) : (
            <>
              <button
                type="button"
                className="flex flex-1 items-center gap-1.5 truncate text-left"
                onClick={() => onSelect(node.module.id)}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="truncate">{node.module.name}</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  {node.directCaseCount}
                </span>
              </button>
              <div className="hidden items-center gap-0.5 group-hover:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t("testCaseManagement.module.addChild")}
                  onClick={() =>
                    setDraft({ parentId: node.module.id, value: "" })
                  }
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t("testCaseManagement.module.rename")}
                  onClick={() => {
                    setRenamingId(node.module.id);
                    setRenameValue(node.module.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t("testCaseManagement.module.delete")}
                  onClick={() => onDeleteModule(node)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
        {draft && draft.parentId === node.module.id ? (
          <DraftInput
            depth={depth + 1}
            draft={draft}
            placeholder={t("testCaseManagement.module.namePlaceholder")}
            onChange={(value) => setDraft({ ...draft, value })}
            onSubmit={submitDraft}
            onCancel={() => setDraft(null)}
          />
        ) : null}
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 py-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase">
          {t("testCaseManagement.module.sectionTitle")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={t("testCaseManagement.module.add")}
          onClick={() => setDraft({ parentId: null, value: "" })}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm",
            selectedModuleId === null
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/60",
          )}
          onClick={() => onSelect(null)}
        >
          <span className="truncate">
            {t("testCaseManagement.module.allCases")}
          </span>
          <span className="text-muted-foreground ml-auto text-xs">
            {cases.length}
          </span>
        </button>
        {draft && draft.parentId === null ? (
          <DraftInput
            depth={0}
            draft={draft}
            placeholder={t("testCaseManagement.module.namePlaceholder")}
            onChange={(value) => setDraft({ ...draft, value })}
            onSubmit={submitDraft}
            onCancel={() => setDraft(null)}
          />
        ) : null}
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
}

interface DraftInputProps {
  depth: number;
  draft: DraftState;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function DraftInput({
  depth,
  draft,
  placeholder,
  onChange,
  onSubmit,
  onCancel,
}: DraftInputProps) {
  return (
    <div style={{ paddingLeft: `${depth * 16 + 8}px` }} className="py-1 pr-2">
      <Input
        autoFocus
        value={draft.value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSubmit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmit();
          } else if (event.key === "Escape") {
            onCancel();
          }
        }}
        className="h-7"
      />
    </div>
  );
}
