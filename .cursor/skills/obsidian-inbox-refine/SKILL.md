---
name: obsidian-inbox-refine
description: "提炼 MyWiki 的 meta/inbox.md 碎片，把零散线索升级为正式 wiki 页或清理掉。触发词：提炼 inbox、清理收件箱、整理碎片、refine inbox、把 inbox 归类。"
---

# obsidian-inbox-refine：Inbox 提炼

Inbox 是低门槛入口：先丢进去，后整理。本技能定期清空它，避免变成垃圾堆。

## 流程

1. 读 `wiki/meta/inbox.md` 的「Inbox（待提炼）」段。
2. 逐条判断：
   - 值得成页 → 路由到对应目录（concept/entity/source/question/central/projects），按模板建页，补全写后闭环。
   - 多条可合并 → 合并成一页。
   - 已过时/无价值 → 与用户确认后删除该条。
   - 暂不确定 → 保留，标注原因。
3. 更新 `inbox.md`：移除已处理条目。
4. 写后闭环（若新建了页）。

## 原则

- 不强行成页：宁可删，不要制造低质量孤岛页。
- 一次处理一批，处理完报告「N 条 → 新建 X 页，合并 Y 条，删除 Z 条」。
