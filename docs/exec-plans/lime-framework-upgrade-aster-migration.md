# Lime 框架升级 · Aster → Canonical 迁移（Batch C 交付）

> 状态：待实施（Batch C 阻塞项）  
> 主计划：[`lime-framework-upgrade-plan.md`](./lime-framework-upgrade-plan.md)  
> 影响文件：`src/features/test-case-management/aiGeneration.ts`

## 背景

Ember 用例 AI 生成通过 `hostOptions.asterChatRequest` 调用 App Server；Lime v1.90+ 已物理删除 `aster_backend.rs`，Batch C 合入后该路径不可用。

## 当前调用链

```text
test-case-management/aiGeneration.ts
  → appServerClient.startTurn({ runtimeOptions: { hostOptions: { asterChatRequest } } })
  → （历史）aster_backend
```

## 目标调用链（Batch C 后）

```text
test-case-management/aiGeneration.ts
  → appServerClient.startTurn({ input, runtimeOptions })  # canonical，无 asterChatRequest
  → ThreadStore / RuntimeCore current 路径
  → readSession 提取 assistant 文本（逻辑可复用现有 extract 函数）
```

## 用户可见验收（T7）

| # | 场景 | 通过标准 |
| --- | --- | --- |
| 1 | 给定模块描述生成用例 | 返回合法 JSON / 用例结构，与迁移前样本等价 |
| 2 | 流式输出 | `stream: true` 仍能完成，无 aster 相关错误 |
| 3 | 失败路径 | 无 assistant 输出时错误文案与现有一致 |

## 回滚

- 若 Batch C 迁移失败，可回滚到 Batch B tag，但 aster 路径在完整 v1.104 框架下不可长期保留。
- 迁移 commit 独立：`framework-upgrade/batch-c-aster-migration`。

## 下一步

Batch C 开始时先改 `aiGeneration.ts` 并单测/手工 T7，再合入 ember-rs 主体。
