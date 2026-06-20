# docs

## 目录定位

`docs/` 是 Ember / 熠测 仓库的**统一文档根目录**，承接：

- **工程事实源**：工程规则、路线图、执行计划、测试策略与长期技术专题（原 `internal/`）
- **产品资料**：README 配图（`images/`）、功能设计稿（`superpowers/`）

## 核心入口

| 目录 | 用途 |
| --- | --- |
| `aiprompts/` | 模块级工程导航、架构说明、质量流程、命令边界、治理规则 |
| `exec-plans/` | 执行计划、进度日志、技术债追踪 |
| `refactor/` | 渐进式重构方案（文件体量治理、目录架构蓝图） |
| `roadmap/` | 平台与产品路线图 |
| `test/`、`tests/`、`testing/` | 测试策略、场景、manifest、QC 与 E2E 资料 |
| `develop/` | 开发流程、专项技术计划与协作规范 |
| `images/` | README 与对外展示配图 |
| `superpowers/` | 功能设计 spec 与实现计划 |

## 路线图子域

- `appserver/` — App Server / Electron Desktop Host 架构与协议
- `agentruntime/` — Agent Runtime 主链
- `agentui/` — Agent UI 标准包与 projection 迁移
- `agentapp/` — Agent App 能力面
- `device-ui-agent/` — 端自动化 / 设备镜像（熠测核心能力）
- `harness-engine/` — Harness Engine 证据与回放治理
- `test/` — Vitest 分层与测试治理
- `task/` — 任务分层 / 模型经济调度
- `warp/` — Modality 能力矩阵与 artifact graph（守卫事实源）
- `artifacts/` — Artifact 框架边界
- `i18n/` — 术语表（`glossary.md`）

## 阅读顺序

1. 根目录 `../AGENTS.md` — 仓库级硬规则
2. `aiprompts/README.md` — 按场景进入模块级工程文档
3. `exec-plans/README.md` — 长期任务与进度
4. `aiprompts/governance.md` — 旧路径迁移与 compat 收口

## 维护规则

1. 工程长期事实源落在 `docs/` 对应子目录，不散落到仓库其他位置。
2. 新增一级目录时同步更新本文件与根 `AGENTS.md` 导航。
3. 能机械验证的规则优先补脚本或测试守卫。
4. 私有材料继续遵循 `.gitignore` 的 `docs/` 子目录规则。
