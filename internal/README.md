# internal

## 目录定位

`internal/` 是 Ember / 熠测 仓库的内部工程事实源，承接工程规则、路线图、执行计划、测试策略与长期技术专题。

`../docs/` 只作为对外文档站包使用，不承载内部工程事实源。

## 核心入口

| 目录 | 用途 |
| --- | --- |
| `aiprompts/` | 模块级工程导航、架构说明、质量流程、命令边界、治理规则 |
| `exec-plans/` | 执行计划、进度日志、技术债追踪 |
| `refactor/` | 渐进式重构方案（文件体量治理、目录架构蓝图） |
| `roadmap/` | 平台与产品路线图（见下方保留子域） |
| `test/`、`tests/`、`testing/` | 测试策略、场景、manifest、QC 与 E2E 资料 |
| `develop/` | 开发流程、专项技术计划与协作规范 |

## 路线图保留子域

精简后 `roadmap/` 只保留与当前平台主线直接相关的子域：

- `appserver/` — App Server / Electron Desktop Host 架构与协议
- `agentruntime/` — Agent Runtime 主链
- `agentui/` — Agent UI 标准包与 projection 迁移
- `agentapp/` — Agent App 能力面（仅保留总览与实施计划）
- `device-ui-agent/` — 端自动化 / 设备镜像（熠测核心能力）
- `harness-engine/` — Harness Engine 证据与回放治理
- `test/` — Vitest 分层与测试治理
- `task/` — 任务分层 / 模型经济调度
- `warp/` — Modality 能力矩阵与 artifact graph（守卫事实源）
- `artifacts/` — Artifact 框架边界
- `i18n/` — 术语表（`glossary.md`）；evidence JSON 由脚本生成

已移除的弱关联子域包括：Soul、Voice、专家广场、Skill Forge、Memory 人格、Managed Objective、AI 分层设计、Agent Workbench SDK、旧 PRD / 迭代备忘 / 运营材料等。

## 当前迁移边界

- `ember-rs/src/**` 是旧主 crate 与迁移来源区，不再作为业务逻辑长期 owner；新能力进入 `ember-rs/crates/**` 的 App Server / RuntimeCore / services。
- `ember-rs/src/commands/**` 是旧 Tauri wrapper 清理区，不再承接新业务。
- 桌面壳能力进入 Electron Desktop Host；渲染层 bridge 走 `src/lib/dev-bridge/**` current 主链。
- 非生成代码超过 `1000` 行时必须拆分；无法本轮拆分时登记 `exec-plans/tech-debt-tracker.md`。

## 阅读顺序

1. 根目录 `../AGENTS.md` — 仓库级硬规则
2. `aiprompts/README.md` — 按场景进入模块级工程文档
3. `exec-plans/README.md` — 长期任务与进度
4. `aiprompts/governance.md` — 旧路径迁移与 compat 收口

## 维护规则

1. 内部长期事实源默认落在本目录，不落在 `../docs/`。
2. 新增一级目录时同步更新本文件与根 `AGENTS.md` 导航。
3. 能机械验证的规则优先补脚本或测试守卫。
4. 私有材料继续遵循 `.gitignore` 的 `internal/` 规则。
