"""skill-creator 脚本包。

提供 run_loop 深度优化所需的纯函数工具（数据分割、评分汇总、报告渲染）。
这些函数不调用 LLM，只做确定性计算，便于单元测试与复现。
LLM 相关步骤（改写 description、判定触发）由 agents/ 下的子代理在 Agent 运行时执行。
"""

from __future__ import annotations

import json
import random
from pathlib import Path


def split_eval_set(query_ids: list[str], ratio: float = 0.6, seed: int = 42) -> dict:
    """把 query id 列表按比例分成 train / test，固定 seed 保证可复现。

    防过拟合的第一道闸：最终择优只看 test，analyzer 只看 train。
    """
    rng = random.Random(seed)
    shuffled = list(query_ids)
    rng.shuffle(shuffled)
    cut = round(len(shuffled) * ratio)
    return {
        "train": sorted(shuffled[:cut]),
        "test": sorted(shuffled[cut:]),
        "ratio": ratio,
        "seed": seed,
    }


def majority_vote(votes: list[bool]) -> bool:
    """多次运行结果取多数票（3 次中 >=2 次为 True 即 True）。"""
    return sum(1 for v in votes if v) * 2 >= len(votes)


def is_stable(votes: list[bool]) -> bool:
    """判断多次运行是否稳定（全 True 或全 False）。"""
    return len(set(votes)) == 1


def score_grades(grades: list[dict]) -> float:
    """根据 grader 输出的判定列表计算通过率（trigger 准确率）。"""
    if not grades:
        return 0.0
    passed = sum(1 for g in grades if g.get("verdict") == "pass")
    return round(passed / len(grades), 4)


def load_eval_set(path: str | Path) -> dict:
    """读取 eval set JSON，校验数量约定（8 trigger + 12 no-trigger = 20）。"""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    queries = data.get("queries", [])
    trigger = sum(1 for q in queries if q.get("expected") == "trigger")
    no_trigger = sum(1 for q in queries if q.get("expected") == "no-trigger")
    if len(queries) != 20 or trigger != 8 or no_trigger != 12:
        # 不直接报错，返回告警，由调用方决定降级
        data["_warning"] = (
            f"eval set 约定为 20 条（8 trigger + 12 no-trigger），"
            f"实际 {len(queries)} 条（{trigger} trigger + {no_trigger} no-trigger）"
        )
    return data
