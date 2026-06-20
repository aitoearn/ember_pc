/**
 * 测试用例管理页（US1 三栏装配）。
 *
 * 左：模块树；右：用例工具条 + 列表 + 详情抽屉。状态（筛选 / 选中 / 抽屉）留在本页，
 * 数据与 CRUD 走 useTestCaseStore，纯函数 ViewModel 负责筛选与统计。
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Page, PageParams } from "@/types/page";
import {
  createEmptyFilter,
  type TestCase,
  type TestCaseFilter,
  type TestCaseModule,
  type TestCaseRun,
  type TestCaseRunResult,
  type TestCaseStatus,
} from "../types";
import { useTestCaseStore } from "../hooks/useTestCaseStore";
import { filterCases } from "../viewModel/filterCases";
import { computeStats } from "../viewModel/computeStats";
import type { TestCaseModuleNode } from "../viewModel/groupByModule";
import { ModuleTree } from "./ModuleTree";
import { TestCaseTable } from "./TestCaseTable";
import { TestCaseDetailDrawer } from "./TestCaseDetailDrawer";
import { AiGenerationPanel } from "./AiGenerationPanel";
import { ExecutionDrawer } from "./ExecutionDrawer";

interface TestCaseManagementPageProps {
  onNavigate?: (page: Page, params?: PageParams) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createBlankCase(moduleId: string): TestCase {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    caseId: "",
    title: "",
    moduleId,
    priority: "P2",
    caseType: "功能",
    status: "草稿",
    source: "手工",
    precondition: "",
    steps: [{ stepNo: 1, action: "", expected: "" }],
    assertions: [],
    tags: [],
    execResult: "未执行",
    remark: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function TestCaseManagementPage(_props: TestCaseManagementPageProps) {
  const { t } = useTranslation("testCaseManagement");
  const store = useTestCaseStore();
  const [filter, setFilter] = useState<TestCaseFilter>(createEmptyFilter());
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [drawerCase, setDrawerCase] = useState<TestCase | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [execCase, setExecCase] = useState<TestCase | null>(null);

  const effectiveFilter = useMemo<TestCaseFilter>(
    () => ({ ...filter, moduleId: filter.moduleId }),
    [filter],
  );

  const filteredCases = useMemo(
    () => filterCases(store.cases, effectiveFilter),
    [store.cases, effectiveFilter],
  );

  const stats = useMemo(() => computeStats(filteredCases), [filteredCases]);

  const toggleSelect = (id: string, checked: boolean) => {
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

  const toggleAll = (checked: boolean) => {
    setSelectedIds(
      checked ? new Set(filteredCases.map((c) => c.id)) : new Set(),
    );
  };

  const handleSaveCase = async (testCase: TestCase) => {
    try {
      await store.saveCase({ ...testCase, updatedAt: nowIso() });
      toast.success(t("testCaseManagement.toast.saved"));
      setDrawerCase(null);
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.saveFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleImportDrafts = async (drafts: TestCase[]) => {
    let imported = 0;
    const failures: string[] = [];
    for (const draft of drafts) {
      try {
        await store.saveCase({ ...draft, updatedAt: nowIso() });
        imported += 1;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (imported > 0) {
      toast.success(t("testCaseManagement.ai.imported", { count: imported }));
    }
    if (failures.length > 0) {
      toast.error(
        t("testCaseManagement.ai.importFailed", {
          count: failures.length,
          message: failures[0],
        }),
      );
    }
    if (failures.length === 0) {
      setAiPanelOpen(false);
    }
  };

  const handleRunComplete = async (
    _run: TestCaseRun,
    result: TestCaseRunResult,
  ) => {
    if (!execCase) {
      return;
    }
    try {
      await store.saveCase({
        ...execCase,
        execResult: result,
        updatedAt: nowIso(),
      });
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.saveFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    try {
      const deleted = await store.removeCases(ids);
      setSelectedIds(new Set());
      toast.success(t("testCaseManagement.toast.deleted", { count: deleted }));
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.saveFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleBatchSetStatus = async (status: TestCaseStatus) => {
    const targets = store.cases.filter((c) => selectedIds.has(c.id));
    try {
      for (const target of targets) {
        await store.saveCase({ ...target, status, updatedAt: nowIso() });
      }
      setSelectedIds(new Set());
      toast.success(t("testCaseManagement.toast.saved"));
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.saveFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleCreateModule = async (
    name: string,
    parentId: string | null,
  ) => {
    const timestamp = nowIso();
    const module: TestCaseModule = {
      id: crypto.randomUUID(),
      name,
      parentId,
      orderIndex: store.modules.filter((m) => m.parentId === parentId).length,
    };
    try {
      await store.saveModule(module);
      toast.success(t("testCaseManagement.toast.moduleSaved"));
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.moduleDeleteFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleRenameModule = async (module: TestCaseModule, name: string) => {
    try {
      await store.saveModule({ ...module, name });
      toast.success(t("testCaseManagement.toast.moduleSaved"));
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.moduleDeleteFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  const handleDeleteModule = async (node: TestCaseModuleNode) => {
    if (node.children.length > 0 || node.directCaseCount > 0) {
      toast.error(t("testCaseManagement.module.deleteNonEmpty"));
      return;
    }
    try {
      await store.removeModule(node.module.id);
      if (filter.moduleId === node.module.id) {
        setFilter({ ...filter, moduleId: null });
      }
      toast.success(t("testCaseManagement.toast.moduleDeleted"));
    } catch (error) {
      toast.error(
        t("testCaseManagement.toast.moduleDeleteFailed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            {t("testCaseManagement.page.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("testCaseManagement.page.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {t("testCaseManagement.stats.total", { count: stats.total })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiPanelOpen(true)}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            {t("testCaseManagement.ai.entry")}
          </Button>
        </div>
      </div>

      {store.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("testCaseManagement.toast.loadFailed", { message: store.error })}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-60 shrink-0 rounded-md border">
          <ModuleTree
            modules={store.modules}
            cases={store.cases}
            selectedModuleId={filter.moduleId}
            onSelect={(moduleId) => setFilter({ ...filter, moduleId })}
            onCreateModule={handleCreateModule}
            onRenameModule={handleRenameModule}
            onDeleteModule={handleDeleteModule}
          />
        </div>

        <div className="min-w-0 flex-1">
          {store.loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <TestCaseTable
              cases={filteredCases}
              filter={filter}
              onFilterChange={setFilter}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onOpenCase={setDrawerCase}
              onExecute={setExecCase}
              onNewCase={() =>
                setDrawerCase(createBlankCase(filter.moduleId ?? ""))
              }
              onBatchSetStatus={handleBatchSetStatus}
              onBatchDelete={handleBatchDelete}
            />
          )}
        </div>
      </div>

      <TestCaseDetailDrawer
        open={drawerCase !== null}
        initialCase={drawerCase}
        modules={store.modules}
        existingCases={store.cases}
        onClose={() => setDrawerCase(null)}
        onSave={handleSaveCase}
      />

      <AiGenerationPanel
        open={aiPanelOpen}
        workspaceId={store.workspaceId}
        moduleId={filter.moduleId ?? ""}
        onClose={() => setAiPanelOpen(false)}
        onImport={handleImportDrafts}
      />

      <ExecutionDrawer
        open={execCase !== null}
        workspaceId={store.workspaceId}
        testCase={execCase}
        onClose={() => setExecCase(null)}
        onRunComplete={handleRunComplete}
      />
    </div>
  );
}
