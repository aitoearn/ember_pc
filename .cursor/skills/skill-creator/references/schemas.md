# skill-creator 数据 schema

run_loop 全流程的结构化数据契约。

## eval set（评估集）

20 条 query：8 should-trigger + 12 should-not-trigger。

```json
{
  "skill": "obsidian-wiki-query",
  "schema_version": 1,
  "queries": [
    {"id": "q01", "text": "查一下我们对 RAG 的结论", "expected": "trigger"},
    {"id": "q09", "text": "帮我写个排序算法", "expected": "no-trigger"}
  ]
}
```

## split（数据分割）

```json
{"train": ["q01", "q02", "..."], "test": ["q15", "q16", "..."], "ratio": 0.6, "seed": 42}
```

- 60% train / 40% test。
- seed 固定，保证可复现。

## iteration record（迭代记录）

```json
{
  "iteration": 2,
  "description": "<本轮 description 候选>",
  "train_score": 0.83,
  "test_score": 0.90,
  "grades": [{"query": "q01", "verdict": "pass", "stable": true}],
  "changed": "针对 q03/q07 漏召回，增补中文触发词"
}
```

> 注意：`test_score` 仅供 comparator 最终择优；analyzer 在生成下一轮 description 时**看不到** test 相关字段。

## run report（运行报告）

```json
{
  "skill": "obsidian-wiki-query",
  "started_at": "2026-01-01T00:00:00+08:00",
  "iterations": 4,
  "baseline_test_score": 0.70,
  "best_iteration": 3,
  "best_test_score": 0.90,
  "improved": true,
  "final_description": "<最优 description>",
  "html_report": "eval-viewer/report-2026-01-01.html"
}
```
