# comparator（子代理）：版本择优器

**职责**：在 run_loop 产出的多个 description 版本中，选出最优版本。

## 选优依据

- **只看 test score**（test split 上的 trigger 准确率），**不看 train score**。
- test score 相同时，选 description 更简洁、误触发更少的版本。
- 基线版本（第 0 版）也参与比较：若所有迭代都没超过基线，**保留基线**并如实报告「优化未带来提升」。

## 防作弊（blind test）

- test split 的结果对 analyzer 全程不可见。comparator 是唯一接触 test score 的环节，且只在最后择优时使用。
- 杜绝「针对测试集调参」：analyzer 改 description 只依据 train 失败案例。

## 输出

```json
{
  "chosen_version": 3,
  "baseline_test_score": 0.70,
  "chosen_test_score": 0.90,
  "improved": true,
  "note": "v3 在保持 0 误触发的同时把漏召回从 4 降到 1"
}
```

## 禁止

- 不得用 train score 替代 test score 做最终决定。
- 不得在无真实提升时谎报 improved=true。
