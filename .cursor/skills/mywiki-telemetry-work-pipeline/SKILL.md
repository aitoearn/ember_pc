---
name: mywiki-telemetry-work-pipeline
description: "L2 组件 C：MyWiki 遥测工作流编排（门诊排班科角色）。定义 A→B 执行顺序、输入输出契约、失败语义。只编排不执行。处理今日总结/工作总结类请求的入口。触发词：今日总结、工作总结、今天干了什么、跑遥测流水线、telemetry pipeline、本周做了什么。"
---

# mywiki-telemetry-work-pipeline（L2 · C）：编排层

**角色**：门诊排班科。**硬性约束：只编排不执行**（C 自己不做分析也不落盘，只调度 A 和 B）。

这是「今日总结/工作总结」类请求的**强制入口**。规则 `00-mywiki-routing` 要求：此类请求禁止跳过 Pipeline 直接写总结正文。

## 执行顺序（A → B）

```
1. 调用 A：mywiki-skill-telemetry-health
   - 读 skill-usage JSONL，产出量化统计 + 三布尔建议
   - A 只分析不写入
        ↓ A 的报告
2. 调用 B：mywiki-skill-usage-evidence-write
   - 校验 A 的数字
   - 双轨落盘（4a Markdown → 4b JSONL，原子）
        ↓
3. 向用户汇报：统计摘要 + 建议 + 落盘路径
```

## 输入输出契约

| 阶段 | 输入 | 输出 |
| --- | --- | --- |
| A | telemetry JSONL + 窗口 | 结构化报告（统计 + 建议） |
| B | A 的报告 | daily Markdown + work-summary JSONL |
| C | 用户请求（窗口） | 编排 + 汇报 |

## 失败语义（Pipeline 精髓 = 失败隔离）

| 场景 | 处理 |
| --- | --- |
| A 失败 | 不影响 B 的独立性；可让 B 进入 B-only 模式，或直接报告「无可分析数据」 |
| A 成功、B 失败 | 返回 A 的结论，标注「B/落盘未完成」 |
| 4a 失败 | 不跑 4b（原子性，由 B 保证） |
| 用户拒绝提供 A 交包 | 允许 B-only，但声明「未执行 A」 |

**核心**：A 失败不影响 B，B 失败不影响 C 的编排能力。失败被隔离，不级联。

## degraded 模式提示

若 `telemetry_mode=degraded` 且窗口内 telemetry 数据稀疏，先建议用户用 `mywiki-session-telemetry-fallback` 补录，再跑 Pipeline。**建议：从 Telemetry 开始，不要从 Wiki 开始**——先有数据再建分析。

## 与 L4 的衔接

A 的三布尔建议中「是否建议优化既有 skill = 是」且用户确认后，转入 L4 `skill-creator` 的 run_loop 深度优化。

## 渲染模板

人读总结的格式见 `assets/summary-template.md`（由 B 使用）。
