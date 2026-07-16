# Lime 框架升级 · 合入对齐脚本

配合 `internal/exec-plans/lime-framework-upgrade-*.md` 使用。

## 脚本

| 脚本 | 作用 |
| --- | --- |
| `check-freeze-boundary.mjs` | 合入前/提交前检查变更是否触碰 Layer 2 冻结区 |
| `export-lime-batch-patch.mjs` | 从 Lime 仓库按批次导出 `git diff` patch |
| `filter-lime-batch-patch.mjs` | 剔除冻结路径并做 `lime-rs` → `ember-rs` 改写 |
| `apply-lime-batch-patch.mjs` | 过滤后 `git apply --check` / `--apply` |
| `backup-layer2-freeze.mjs` | 合入前打包 Layer 2 tarball |
| `m05-host-wiring-smoke.mjs` | M0.5 结构快检 + 可选 T5 adb |
| `lib/freeze-manifest.mjs` | 读取 manifest、路径映射、匹配规则（可单测） |

## 典型流程

```bash
# 1. 导出 Batch A patch 并做冻结检查（lime-rs 自动映射 ember-rs）
LIME=/Users/lisq/project/agent/lime \
  node scripts/lime-framework-upgrade/export-lime-batch-patch.mjs --batch A --check

# 2. 在 Ember 仓库试应用（不提交）
git apply --check /tmp/lime-batch-a.patch

# 3. 合入并做品牌/路径替换后，检查工作区
node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --git-diff

# 4. 若改了 package.json，额外保护 device-automation 脚本键
node scripts/lime-framework-upgrade/check-freeze-boundary.mjs --git-diff --check-package-scripts

# 5. 批次门禁（方案 §6）
npm run verify:local
npm run test:contracts
```

## npm 快捷命令

```bash
npm run lime-framework:check-freeze
npm run lime-framework:check-freeze:staged
npm run lime-framework:export-patch -- --batch A --check
npm run lime-framework:inventory
npm run lime-framework:backup-layer2
node scripts/lime-framework-upgrade/restore-layer2-freeze.mjs --skip-directories
npm run lime-framework:apply-patch -- --batch A --dirs packages,scripts --apply
```

## 事实源

`scripts/lime-framework-upgrade/freeze-manifest.json`
