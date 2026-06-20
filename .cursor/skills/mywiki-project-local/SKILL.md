---
name: mywiki-project-local
description: "MyWiki project-local 模式说明。解释把知识库放在项目内 .mywiki/wiki/ 的取舍、初始化方式与目录约定。触发词：project-local 模式、项目内知识库、把知识库放项目里、.mywiki 是什么。"
---

# mywiki-project-local：项目内知识库模式

把 wiki 放在项目自身的 `.mywiki/wiki/`，知识跟随项目走（随仓库提交、随项目迁移）。

## 何时用

- 知识强绑定单一项目（架构决策、踩坑、私有约定）。
- 不需要 Obsidian 图形界面。
- 希望知识随项目 git 一起版本化。

## 初始化

```bash
bash <kit>/scripts/init-project-local.sh /path/to/project
```

它把 `kit/wiki-scaffold/` 复制到 `<project>/.mywiki/wiki/`，已存在则跳过。
随后 `detect-runtime-mode.sh` 会把 `storage_mode` 记为 `project-local`、`wiki_dir` 指向 `.mywiki/wiki`。

## 目录约定

```
<project>/
├── .cursor/
│   ├── rules/        # MyWiki 规则
│   ├── skills/       # MyWiki 技能
│   └── runtime-profile.json
└── .mywiki/
    └── wiki/         # 知识库本体（与 vault 模式同构）
```

## 与 vault 模式的差异

| 维度 | project-local | vault |
| --- | --- | --- |
| 位置 | `<project>/.mywiki/wiki/` | 独立目录 |
| Obsidian | 不配置 | 配置 |
| 版本管理 | 随项目仓库 | 独立仓库 |
| 跨项目复用 | 弱（central 仍可用但局限） | 强 |

## .gitignore 建议

通常 **要** 提交 `.mywiki/wiki/`（知识资产）。但 `meta/telemetry/*.jsonl` 含交互内容，按隐私需要选择是否忽略。
