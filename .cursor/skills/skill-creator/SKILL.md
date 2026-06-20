---
name: skill-creator
description: "L4 反馈优化：让 MyWiki 的 skill 数据驱动地自我进化。含 Summary-Mode 轻量诊断与 run_loop 深度优化（eval set + train/test split + A/B 测试）。优化 skill 的 description 以提升触发率。触发词：优化这个 skill、提升触发率、skill 进化、run loop、新建 skill、skill creator、优化 description。"
---

# skill-creator（L4）：Skill 自我进化

Skill 的「进化」不靠人肉直觉，靠数据驱动的 A/B 测试。把「用户是否会触发 skill」当作要优化的转化率指标。

两层优化：**Summary-Mode（轻量诊断）** 与 **run_loop（深度优化）**。

---

## 第一层：Summary-Mode（轻量诊断）

嵌在 L2 Pipeline A 内部执行（A 的「Skill 体系结论」就是它的输出）。输出三问一原因：

- 是否建议补 trigger 样例
- 是否建议优化既有 skill
- 是否建议新建 skill
- 原因 + `scope_project` + 涉及 skill

Summary-Mode 不改任何文件，只给方向。

---

## 第二层：run_loop（深度优化）

当 Summary-Mode 建议「优化既有 skill」**且用户确认**后进入。

### 输入

- 目标 skill 路径（如 `.cursor/skills/obsidian-wiki-query/SKILL.md`）
- eval set：**20 个 query**（8 个 should-trigger + 12 个 should-not-trigger）

### 循环

```
Step 1  数据分割：60% train / 40% test（防过拟合）
Step 2  基线评估：每个 query 跑 3 次，统计 trigger rate
Step 3  结果评分：通过 / 失败（grader）
Step 4  若未全部通过：
          - 调用 LLM 基于失败案例优化 description（analyzer）
          - 更新 description
          - 回到 Step 2（最多 5 次迭代）
Step 5  选择最优版本：依据 test score，非 train score（comparator）
OUTPUT  最优 description + HTML 评估报告
```

### 子代理（agents/）

| 文件 | 角色 |
| --- | --- |
| `agents/analyzer.md` | 基于失败案例改写 description |
| `agents/grader.md` | 判定每个 query 是否正确触发（通过/失败） |
| `agents/comparator.md` | 按 test score 选最优版本，杜绝针对测试集作弊 |

### 防过拟合机制

| 措施 | 说明 |
| --- | --- |
| train/test split | 不分割会「记住」训练集而非学会触发规则 |
| test score 选优 | 最终依据 test score 而非 train score |
| Blind test scores | 改进模型看不到 test 结果 |
| Max iterations = 5 | 避免无限循环与资源浪费 |
| Live HTML report | 每次迭代生成报告（`assets/eval_review.html` 模板），用户可实时查看 |

### 数据 schema

eval set、迭代记录、评分结果的 JSON schema 见 `references/schemas.md`。
脚本骨架见 `scripts/`（`__init__.py` 为包入口）。

---

## 失败与边界

- eval set 不足 20 条 → 提示用户补全或降级为 Summary-Mode-only。
- 5 次迭代后仍未全过 → 选 test score 最高版本，报告残留失败案例，不强行宣告成功。
- **禁止伪造评分**：trigger rate 必须来自真实多次运行。

## 与复利循环的衔接

trigger rate 70% → 90% 的提升，会反映在下一轮 L2 A 分析中（skills_unknown 下降）。这是「数据驱动进化」原则闭环的关键一环。
