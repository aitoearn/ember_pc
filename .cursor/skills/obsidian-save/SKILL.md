---
name: obsidian-save
description: "把当前对话的结论保存为 MyWiki 知识库页面。提炼会话要点、判断落点、写页面、补全写后闭环。触发词：保存这个结论、save、记一下、把这次讨论存进知识库、归档对话、提交代码、commit、git commit（提交联动模式）。"
---

# obsidian-save：保存会话结论

把刚才对话里有价值的结论固化成 wiki 页，别让洞察消失在聊天记录里。

## 流程

1. **定位 wiki**：`python3 <kit>/scripts/mywiki_storage.py wiki-dir`。
2. **提炼**：把本次对话压缩成「结论 + 依据 + 关联」。问用户「重点存哪部分？」
3. **判断落点**（调用 `mywiki-router` 的判定逻辑）：
   - 通用、可跨项目复用 → `wiki/central/`
   - 绑定具体项目 → `wiki/projects/<project-id>/`
   - 是一个问答 → `wiki/questions/`
   - 是一个概念/实体 → 对应目录
4. **写页面**：选对应 `_templates/` 模板，填 frontmatter，正文带双链引用。
5. **写后闭环**：`index.md` → 域 `_index.md` → `log.md` → `hot.md`。

## 与 ingest 的区别

- `ingest`：处理**外部源**（文件/URL/图片）。
- `save`：固化**本次对话产出的结论**，无外部源。

## 质量门槛

只存「6 个月后仍有用」的内容。临时性、一次性的讨论不值得占用知识库。把不确定的碎片先丢进 `meta/inbox.md`，由 `obsidian-inbox-refine` 后续提炼。

## 提交联动模式（commit coupling）

**触发**：用户要求 `提交代码` / `commit` / `git commit` 等（见 `.cursor/rules/04-mywiki-commit-coupling.mdc`）。

与手动 save 的区别：

| 项 | 手动 save | 提交联动 |
| --- | --- | --- |
| 是否问「重点存哪部分？」 | 可问 | **默认不问**，自动提炼 P0–P2 |
| 与 git 顺序 | 独立 | **先 commit 成功，再 save 闭环** |
| commit hash | 可选 | **必须写入**沉淀正文与 log 条目 |
| 页面粒度 | 用户导向 | 小改更新 runbook；大改/联调新建复盘页 |
| 无可沉淀 | 可不写 | 跳过 wiki，收尾说明无写入 |

流程：git 提交完成 → 定位 wiki → 提炼 → router 落点 → 写页（含 hash）→ 写后闭环。

## 遥测（degraded）

保存后补录 skill-usage：`skill="obsidian-save"`、`pages_created`、`scope_project`、`outcome`。
