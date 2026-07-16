# Lime → Ember 品牌迁移进度

## 目标

将产品品牌从 **Lime** 迁移为 **Ember**（端自动化测试平台），分阶段替换用户可见品牌、设计 token、代码命名空间与构建标识。

## 阶段

| 阶段 | 范围 | 状态 |
| --- | --- | --- |
| P1 | 品牌门面：logo、窗口标题、forge 产品名、i18n 产品文案、`branding.ts` | 已完成 |
| P2 | 设计 token：`--lime-*` → `--ember-*`，配色 ID、localStorage 迁移 | 已完成 |
| P3 | 作用域与 dataset：`lime-workbench-theme-scope`、`data-lime-*` | 已完成 |
| P4 | TS 类型/函数：`LimeColorScheme*` → `EmberColorScheme*` | 已完成 |
| P5 | npm 包名、`ember-rs/` 目录、CI/脚本路径 | 已完成（2026-06-16 batch5–batch9） |
| P6 | 云端/OEM API 兼容字段（`enabled_ember`、`oemEmberHub` 等） | 已完成（标识符已改；远端 API 兼容需联调） |

## 进度日志

### 2026-06-16（batch5 全量）

- `scripts/migration/rename-lime-to-ember-batch5-full.mjs`：1622 文件文本替换
- `batch6-paths`：`ember-rs` → `ember-rs`、`extensions/ember-chrome` → `ember-chrome`、`packages/ember-cli-npm` → `ember-cli-npm`、`tools/lime-cli` → `ember-cli`
- `batch7-camel` / `batch8-final` / `batch9`：i18n 函数名、Rust 类型、工具协议 ID 等残留
- 修复 `src/lib/branding.ts` 重复导出导致的循环引用
- 待续：`Cargo.lock` / `pnpm-lock.yaml` 需重新生成；部分历史 exec-plan 与 migration 脚本仍保留旧名作为 evidence

## 阶段

| 阶段 | 范围 | 状态 |
| --- | --- | --- |
| P1 | 品牌门面：logo、窗口标题、forge 产品名、i18n 产品文案、`branding.ts` | 已完成 |
| P2 | 设计 token：`--ember-*` → `--ember-*`，配色 ID、localStorage 迁移 | 已完成 |
| P3 | 作用域与 dataset：`ember-workbench-theme-scope`、`data-ember-*` | 已完成 |
| P4 | TS 类型/函数：`EmberColorScheme*` → `EmberColorScheme*` | 已完成 |
| P5 | npm 包名、`ember-rs/` 目录、CI/脚本路径 | 未开始 |
| P6 | 云端/OEM API 兼容字段（`enabled_ember`、`oemEmberHub` 等） | 未开始 |

## 进度日志

### 2026-06-16（续）

- batch1：124 文件 token/类型/作用域机械替换
- batch2：i18n 五语言、forge 产品名、branding、index.html slogan
- batch3：SDK `applyEmberHostTheme`、测试与 fixture 品牌名
- `ember-classic` 主色改为橙黄 `#FDA92D`，`public/logo.png` 已替换
- 2026-06-16：应用图标统一为 aiearn 橙黄渐变 Logo；源图 `resources/branding/app-icon-source.png`，生成脚本 `npm run branding:generate-app-icons`
- localStorage legacy 迁移：`ember.appearance.color-scheme` → `ember.*`

### 2026-06-16（续 3）

- batch4：`scripts/migration/rename-ember-to-ember-batch4.mjs` 全仓 `\bLime\b` 品牌文案迁移（640+ 文件）
- zh-CN/zh-TW i18n 品牌词使用「余烬」；en/ja/ko 使用 Ember
- `src/`、`electron/` 已无 `\bLime\b` 残留（迁移脚本自身除外）
- 未动：P5 `ember-rs/` 目录名、`com.embercloud.ember` bundle id、`oemLime*` 代码标识符、URL 域名

- 中文品牌定稿：**余烬**（`EMBER_BRAND_NAME_ZH`），`resolveEmberBrandDisplayName(locale)` 按 locale 解析
- 用户可见 slogan：`余烬一下，端测即启`（zh-CN/zh-TW、Splash、index.html、Electron 启动页、Agent 首页）
- 配色 `ember-citron` 标签由「青柠」改为「柠黄」，与产品品牌区分
- Sidebar / 关于页 / 启动加载屏中文 locale 显示「余烬」

## 退出条件（P1–P4 + 中文品牌）

- [x] 无 `--ember-` / `ember-workbench-theme-scope` 残留在 `src/` 与 `index.css`
- [x] `npm run typecheck` 通过
- [x] appearance / branding / CanvasWorkbench 相关单测通过
- [x] 应用启动页与关于页：英文 **Ember**，中文 **余烬**

## 下一刀（P5–P6）

- `package.json` name、`ember-rs/` 目录、`com.embercloud.ember` bundle id
- Agent App SDK 协议名 `ember.agent` / `ember.ui`（对外兼容层，需单独计划）
- 日志文件名 `ember.log`、localStorage 业务 key（`ember.app-sidebar.*` 等）
