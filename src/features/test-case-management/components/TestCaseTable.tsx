/**
 * 用例列表（US1）。
 *
 * 顶部工具条：搜索 + 多维下拉筛选 + 新建用例；选中后出现批量条（改状态 / 删除）。
 * 筛选为单值下拉映射到 ViewModel 的多选数组（空数组=不限），MVP 先满足组合筛选。
 */

import { useTranslation } from "react-i18next";
import { Play, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TEST_CASE_EXEC_RESULTS,
  TEST_CASE_PRIORITIES,
  TEST_CASE_SOURCES,
  TEST_CASE_STATUSES,
  TEST_CASE_TYPES,
  type TestCase,
  type TestCaseExecResult,
  type TestCaseFilter,
  type TestCasePriority,
  type TestCaseStatus,
} from "../types";

const ALL_VALUE = "__all__";

const PRIORITY_BADGE: Record<TestCasePriority, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-orange-100 text-orange-700",
  P2: "bg-blue-100 text-blue-700",
  P3: "bg-slate-100 text-slate-600",
};

const EXEC_RESULT_BADGE: Record<TestCaseExecResult, string> = {
  未执行: "bg-slate-100 text-slate-600",
  通过: "bg-green-100 text-green-700",
  失败: "bg-red-100 text-red-700",
  阻塞: "bg-amber-100 text-amber-700",
};

interface TestCaseTableProps {
  cases: TestCase[];
  filter: TestCaseFilter;
  onFilterChange: (filter: TestCaseFilter) => void;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpenCase: (testCase: TestCase) => void;
  onExecute: (testCase: TestCase) => void;
  onNewCase: () => void;
  onBatchSetStatus: (status: TestCaseStatus) => void;
  onBatchDelete: () => void;
}

function toArray<T extends string>(value: string): T[] {
  return value === ALL_VALUE ? [] : [value as T];
}

function fromArray<T extends string>(values: readonly T[]): string {
  return values.length === 1 ? values[0] : ALL_VALUE;
}

export function TestCaseTable({
  cases,
  filter,
  onFilterChange,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onOpenCase,
  onExecute,
  onNewCase,
  onBatchSetStatus,
  onBatchDelete,
}: TestCaseTableProps) {
  const { t } = useTranslation("testCaseManagement");
  const allChecked = cases.length > 0 && cases.every((c) => selectedIds.has(c.id));
  const selectedCount = selectedIds.size;

  const renderFilter = <T extends string>(
    label: string,
    options: readonly T[],
    current: readonly T[],
    apply: (values: T[]) => void,
  ) => (
    <Select
      value={fromArray(current)}
      onValueChange={(value) => apply(toArray<T>(value))}
    >
      <SelectTrigger className="h-9 w-auto min-w-[110px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>
          {`${label}: ${t("testCaseManagement.filter.all")}`}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filter.keyword}
            placeholder={t("testCaseManagement.toolbar.searchPlaceholder")}
            onChange={(event) =>
              onFilterChange({ ...filter, keyword: event.target.value })
            }
            className="h-9 pl-8"
          />
        </div>
        {renderFilter(
          t("testCaseManagement.filter.priority"),
          TEST_CASE_PRIORITIES,
          filter.priorities,
          (priorities) => onFilterChange({ ...filter, priorities }),
        )}
        {renderFilter(
          t("testCaseManagement.filter.type"),
          TEST_CASE_TYPES,
          filter.caseTypes,
          (caseTypes) => onFilterChange({ ...filter, caseTypes }),
        )}
        {renderFilter(
          t("testCaseManagement.filter.status"),
          TEST_CASE_STATUSES,
          filter.statuses,
          (statuses) => onFilterChange({ ...filter, statuses }),
        )}
        {renderFilter(
          t("testCaseManagement.filter.source"),
          TEST_CASE_SOURCES,
          filter.sources,
          (sources) => onFilterChange({ ...filter, sources }),
        )}
        {renderFilter(
          t("testCaseManagement.filter.execResult"),
          TEST_CASE_EXEC_RESULTS,
          filter.execResults,
          (execResults) => onFilterChange({ ...filter, execResults }),
        )}
        <Button size="sm" onClick={onNewCase}>
          <Plus className="mr-1 h-4 w-4" />
          {t("testCaseManagement.toolbar.newCase")}
        </Button>
      </div>

      {selectedCount > 0 ? (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <span>
            {t("testCaseManagement.batch.selected", { count: selectedCount })}
          </span>
          <Select onValueChange={(value) => onBatchSetStatus(value as TestCaseStatus)}>
            <SelectTrigger className="h-8 w-auto min-w-[130px]">
              <SelectValue
                placeholder={t("testCaseManagement.batch.setStatus")}
              />
            </SelectTrigger>
            <SelectContent>
              {TEST_CASE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={onBatchDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            {t("testCaseManagement.batch.delete")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAll(false)}
          >
            {t("testCaseManagement.batch.clear")}
          </Button>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(checked) => onToggleAll(checked === true)}
                  aria-label="select-all"
                />
              </TableHead>
              <TableHead className="w-32">
                {t("testCaseManagement.table.caseId")}
              </TableHead>
              <TableHead>{t("testCaseManagement.table.title")}</TableHead>
              <TableHead className="w-20">
                {t("testCaseManagement.table.priority")}
              </TableHead>
              <TableHead className="w-20">
                {t("testCaseManagement.table.type")}
              </TableHead>
              <TableHead className="w-24">
                {t("testCaseManagement.table.status")}
              </TableHead>
              <TableHead className="w-20">
                {t("testCaseManagement.table.source")}
              </TableHead>
              <TableHead className="w-24">
                {t("testCaseManagement.table.execResult")}
              </TableHead>
              <TableHead className="w-16">
                {t("testCaseManagement.table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t("testCaseManagement.table.empty")}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((testCase) => (
                <TableRow
                  key={testCase.id}
                  className="cursor-pointer"
                  onClick={() => onOpenCase(testCase)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(testCase.id)}
                      onCheckedChange={(checked) =>
                        onToggleSelect(testCase.id, checked === true)
                      }
                      aria-label={`select-${testCase.caseId}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {testCase.caseId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {testCase.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PRIORITY_BADGE[testCase.priority]}
                    >
                      {testCase.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{testCase.caseType}</TableCell>
                  <TableCell>{testCase.status}</TableCell>
                  <TableCell>{testCase.source}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={EXEC_RESULT_BADGE[testCase.execResult]}
                    >
                      {testCase.execResult}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("testCaseManagement.exec.start")}
                      aria-label={`execute-${testCase.caseId}`}
                      onClick={() => onExecute(testCase)}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
