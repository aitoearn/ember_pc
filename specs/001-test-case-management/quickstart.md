# Quickstart · 验证指引：测试用例管理

本文件描述每期可运行的端到端验证场景。实现细节见 [data-model.md](./data-model.md) 与 [contracts/json-rpc-methods.md](./contracts/json-rpc-methods.md)，不在此重复代码。

## 前置

- 仓库根可运行 `npm run electron:dev` 拉起桌面应用。
- Rust 校验走 workspace manifest：`cargo test --manifest-path "ember-rs/Cargo.toml"`。
- 契约：`npm run test:contracts`；收尾：`npm run verify:local`，GUI 改动加 `npm run verify:gui-smoke`。

## Phase 1a — 用例管理底座（对应 User Story 1）

**验证步骤**：
1. 打开应用，侧边栏进入「测试用例管理」（五语言切换文案正确）。
2. 新建模块「登录」，在其下新建用例「手机号登录-正常」（含 3 个步骤，每步填操作+预期），保存。
3. 尝试用已存在的 `caseId` 再保存一条 → 期望被拒绝并提示（FR-002a）。
4. 录入多条用例，用关键词 + 「优先级=P0、状态=已评审」组合筛选 → 列表与统计一致（SC-002 < 1s）。
5. 多选用例执行批量「设为已评审」→ 全部更新。
6. 尝试删除含用例的「登录」模块 → 期望被拒绝并提示（FR-001a）；清空后再删 → 成功。
7. 重启应用回到页面 → 数据仍在（持久化）。

**自动化验证**：
- 前端：`viewModel/*.unit.test.ts`（筛选/分组/统计/校验）、`api.test.ts`（mock `AppServerClient.request`）、页面渲染/路由 `*.test.tsx`。
- Rust：`test_case_dao.rs` 单测（in-memory db）、`local_data_source` 集成测。
- 契约：`npm run test:contracts`。

## Phase 1b — AI 生成（对应 User Story 2）

**验证步骤**：
1. 打开生成面板，选择模型；可选填「期望数量 + 关注类型」（留空则模型自定，FR-008a）。
2. 粘贴一段需求文本 → 生成 → 草稿列表出现结构化用例。
3. 取消勾选 2 条、修改 1 条标题 → 批量入库 → 入库用例来源=AI生成、状态=草稿。
4. 上传一个 docx 文件 → 能读取正文作为输入；提供一个无法访问的 URL → 期望可读错误提示（FR-013）。

**自动化验证**：`aiDraftParse.ts` 单测（含格式错乱/空返回容错）；面板渲染与入库接线 `*.test.tsx`。

## Phase 1c — 执行与追溯（对应 User Story 3）

**验证步骤**：
1. 选一条用例 + 一台已连接设备 → 发起执行。
2. 智能体按指令操作，结束时给出 通过/失败/阻塞 之一（无静默态，SC-004）。
3. 用例「执行结果」字段更新为本次结论。
4. 多次执行后打开执行历史 → 按时间排列的记录，每条含结论、过程观察、截图（SC-006）。
5. 执行中断开设备 → 结果记为「阻塞」并保留已产生过程信息。

**自动化验证**：`buildInstruction.ts` 单测（指令拼装含「通过条件」）；`testCaseRun/*` 的 Rust 集成测；执行抽屉渲染 `*.test.tsx`。

## 收尾门

- `npm run verify:local` 通过；受影响 Rust 定向测试通过；`npm run test:contracts` 通过；GUI 改动 `npm run verify:gui-smoke` 通过。
