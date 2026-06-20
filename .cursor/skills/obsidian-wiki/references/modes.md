# 运行模式（modes）

存储模式由 `.cursor/runtime-profile.json` 的 `storage_mode` 决定。

| 模式 | MYWIKI_ROOT | wiki 位置 | 适用 |
| --- | --- | --- | --- |
| `vault` | kit 目录自身 | `$MYWIKI_ROOT/wiki/` | 独立知识库，配 Obsidian 浏览原文 |
| `project-local` | 当前项目根 | `$MYWIKI_ROOT/.mywiki/wiki/` | 项目内知识库，无 Obsidian |
| `external-vault` | 用户指定路径 | `$MYWIKI_ROOT/wiki/` | 多项目共享已有 vault |

## 遥测模式（telemetry_mode）

| 模式 | 含义 |
| --- | --- |
| `full` | 有 hooks 自动采集 L1 数据（Claude Code 场景） |
| `degraded` | 无 hooks，L1 靠 `mywiki-session-telemetry-fallback` 手动补录（Cursor 默认） |

## 切换模式

重新运行 `bash <kit>/scripts/detect-runtime-mode.sh`，或手动编辑 runtime-profile.json。切换 storage_mode 不会迁移已有 wiki 内容，需手动搬移。
