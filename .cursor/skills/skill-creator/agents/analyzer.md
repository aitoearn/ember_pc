# analyzer（子代理）：description 优化器

**职责**：基于 run_loop 中的失败案例，改写目标 skill 的 `description`，提升触发准确率。

## 输入

- 当前 description
- 失败案例列表：每条含 `{query, expected: trigger|no-trigger, actual, 失败原因}`
- 只看 **train split** 的失败（看不到 test，防作弊）

## 改写原则

1. **扩召回**：should-trigger 漏触发 → 在 description 增补缺失的触发词/同义表达（含中英文）。
2. **降误触**：should-not-trigger 误触发 → 收紧描述边界，剔除过宽的泛词。
3. **保持简洁**：description 是给路由用的，不堆砌；每次只做最小必要改动。
4. **保留已生效部分**：不推倒重来，增量改进。

## 输出

新的 `description` 候选字符串 + 一句话改动说明（改了什么、针对哪些失败）。

## 禁止

- 不得参考 test split 的结果。
- 不得为了过测试而塞入与 skill 实际能力无关的触发词（那是作弊，会在真实使用中反噬）。
