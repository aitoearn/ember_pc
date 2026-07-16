# Phase 1 · Data Model：测试用例管理

实体与前端既有类型 `src/features/test-case-management/types.ts` 对齐；Rust 侧在 `app-server-protocol` 定义对应 camelCase 类型。

## 实体

### TestCase（测试用例）

| 字段 | 类型 | 说明 / 校验 |
| --- | --- | --- |
| id | string(UUID) | 内部主键 |
| caseId | string | 业务编号 `TC-{模块缩写}-{序号}`；**工作区内唯一**（FR-002a），保存校验冲突 |
| title | string | 必填、非空 |
| moduleId | string | 关联模块；可为根 |
| priority | enum | P0/P1/P2/P3 |
| caseType | enum | 功能/边界/异常/性能/安全/兼容/场景 |
| status | enum | 草稿/待评审/已评审/已废弃（本期可自由切换，不强制流转） |
| source | enum | 手工/AI生成/导入 |
| precondition | string | 前置条件 |
| steps | TestCaseStep[] | 结构化步骤（操作序列）；JSON 列存储 |
| assertions | string[] | 断言/通过条件（与步骤分离的独立验证项）；JSON 列存储。对标行业 AI 测试用例「步骤 + 断言分离」建模（见 research R8），执行期对这组断言独立判定 |
| tags | string[] | 标签；JSON 列存储 |
| execResult | enum | 未执行/通过/失败/阻塞（最近一次结果，由执行回写） |
| remark | string | 备注 |
| createdAt / updatedAt | timestamp | 创建/更新时间 |

### TestCaseStep（测试步骤）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| stepNo | number | 从 1 起的序号 |
| action | string | 操作描述 |
| expected | string | 该步预期（步内即时观察；用例级最终判定见 TestCase.assertions） |

### TestCaseModule（测试模块）

| 字段 | 类型 | 说明 / 校验 |
| --- | --- | --- |
| id | string | 主键 |
| name | string | 必填 |
| parentId | string \| null | 父模块；根为 null |
| orderIndex | number | 同级排序 |

约束：删除**仅空模块**可成功；非空模块（含子模块或用例）拒绝删除并提示（FR-001a）。

### TestCaseRun（执行记录，P3）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| caseId | string | 关联 `test_cases.id` |
| deviceId | string | 目标设备 |
| instruction | string | 拼装的自然语言指令 |
| result | enum | 通过/失败/阻塞 |
| summary | string | 结论摘要 |
| startedAt / finishedAt | timestamp | 起止时间 |
| steps | TestCaseRunStep[] | 过程观察（关联子表） |

### TestCaseRunStep（执行过程步骤，P3）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| runId | string | 关联 `test_case_runs.id` |
| stepNo | number | 序号 |
| observation | string | 智能体过程观察 |
| screenshotPath | string | 截图路径 |
| ts | timestamp | 时间戳 |

## SQLite Schema

所有表带 `workspace_id` 隔离（run_steps 经 run 间接隔离）。`steps`/`assertions`/`tags` 用 JSON 列（照 `workspaces.settings_json` 惯例）。历史库经 `ALTER TABLE test_cases ADD COLUMN assertions_json` 幂等补列。

```sql
-- Phase 1a
CREATE TABLE IF NOT EXISTS test_case_modules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  title TEXT NOT NULL,
  module_id TEXT,
  priority TEXT NOT NULL DEFAULT 'P2',
  case_type TEXT NOT NULL DEFAULT '功能',
  status TEXT NOT NULL DEFAULT '草稿',
  source TEXT NOT NULL DEFAULT '手工',
  precondition TEXT DEFAULT '',
  steps_json TEXT NOT NULL DEFAULT '[]',
  assertions_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  exec_result TEXT NOT NULL DEFAULT '未执行',
  remark TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- caseId 工作区唯一（FR-002a）
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_cases_workspace_caseid
  ON test_cases(workspace_id, case_id);

-- Phase 1c
CREATE TABLE IF NOT EXISTS test_case_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  device_id TEXT,
  instruction TEXT,
  result TEXT NOT NULL DEFAULT '阻塞',
  summary TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS test_case_run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_no INTEGER NOT NULL,
  observation TEXT,
  screenshot_path TEXT,
  ts INTEGER NOT NULL
);
```

## 状态与生命周期

- **用例状态**：草稿 → 待评审 → 已评审 → 已废弃；本期允许任意切换（不实现强制流转引擎，spec Assumptions）。
- **执行结果**：未执行 →（执行后）通过/失败/阻塞；每次执行追加一条 `test_case_runs`，并用本次结论覆盖 `test_cases.exec_result`。
- **AI 入库**：来源 `AI生成`、初始状态 `草稿`（FR-008）。

## 派生数据（前端 ViewModel，不落库）

- 筛选结果、按模块分组、统计摘要（total / byPriority / byStatus / byExecResult）均由前端纯函数从用例集合计算（research R7）。
