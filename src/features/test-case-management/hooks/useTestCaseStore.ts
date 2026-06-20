/**
 * 测试用例管理数据 store hook（US1）。
 *
 * 负责解析默认工作区、加载模块树与用例、并提供 CRUD 操作。变更后重新拉取保证
 * 与后端一致（caseId 唯一、删模块约束等强校验都在后端），同时对失败做 toast 提示。
 */

import { useCallback, useEffect, useState } from "react";
import { requireDefaultProjectId } from "@/lib/api/project";
import {
  deleteTestCaseModule,
  deleteTestCases,
  listTestCaseModules,
  listTestCases,
  saveTestCase,
  saveTestCaseModule,
} from "../api";
import type { TestCase, TestCaseModule } from "../types";

export interface TestCaseStoreState {
  /** 当前工作区 id，未解析完成为空串 */
  workspaceId: string;
  modules: TestCaseModule[];
  cases: TestCase[];
  loading: boolean;
  /** 加载错误信息，无错误为空串 */
  error: string;
}

export interface TestCaseStoreActions {
  reload: () => Promise<void>;
  saveCase: (testCase: TestCase) => Promise<TestCase>;
  removeCases: (ids: string[]) => Promise<number>;
  saveModule: (module: TestCaseModule) => Promise<TestCaseModule>;
  removeModule: (id: string) => Promise<boolean>;
}

export type UseTestCaseStoreResult = TestCaseStoreState & TestCaseStoreActions;

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useTestCaseStore(): UseTestCaseStoreResult {
  const [workspaceId, setWorkspaceId] = useState("");
  const [modules, setModules] = useState<TestCaseModule[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadForWorkspace = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const [loadedModules, loadedCases] = await Promise.all([
        listTestCaseModules(id),
        listTestCases(id),
      ]);
      setModules(loadedModules);
      setCases(loadedCases);
    } catch (loadError) {
      setError(toMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = await requireDefaultProjectId();
        if (cancelled) {
          return;
        }
        setWorkspaceId(id);
        await loadForWorkspace(id);
      } catch (initError) {
        if (!cancelled) {
          setError(toMessage(initError));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadForWorkspace]);

  const reload = useCallback(async (): Promise<void> => {
    if (!workspaceId) {
      return;
    }
    await loadForWorkspace(workspaceId);
  }, [workspaceId, loadForWorkspace]);

  const saveCase = useCallback(
    async (testCase: TestCase): Promise<TestCase> => {
      const saved = await saveTestCase(workspaceId, testCase);
      await reload();
      return saved;
    },
    [workspaceId, reload],
  );

  const removeCases = useCallback(
    async (ids: string[]): Promise<number> => {
      const deleted = await deleteTestCases(ids);
      await reload();
      return deleted;
    },
    [reload],
  );

  const saveModule = useCallback(
    async (module: TestCaseModule): Promise<TestCaseModule> => {
      const saved = await saveTestCaseModule(workspaceId, module);
      await reload();
      return saved;
    },
    [workspaceId, reload],
  );

  const removeModule = useCallback(
    async (id: string): Promise<boolean> => {
      const deleted = await deleteTestCaseModule(workspaceId, id);
      await reload();
      return deleted;
    },
    [workspaceId, reload],
  );

  return {
    workspaceId,
    modules,
    cases,
    loading,
    error,
    reload,
    saveCase,
    removeCases,
    saveModule,
    removeModule,
  };
}
