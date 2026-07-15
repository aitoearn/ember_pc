# Tasks: 004 稳定性保障

> 勾选进度；实现顺序见 [plan.md](./plan.md)。

## Phase 0 · 契约与路由

- [x] 0.1 `contracts/electron-host-commands.md` + ipc/commandPolicy/preload 守卫
- [x] 0.2 Tab `stability-assurance` + legacy alias + Workspace 接线

## Phase 1 · Electron

- [x] 1.1 `captureDeviceLogcat.ts` + monkey `crashLogPath`
- [x] 1.2 `stabilityAnalysis.ts` spawn sa-agent full/analysis
- [x] 1.3 `stabilityLlmConfig.ts` + host read/save

## Phase 2 · Renderer

- [x] 2.1 `StabilityAssurancePanel` + mode switch
- [x] 2.2 崩溃分析 UI + hooks + API
- [x] 2.3 压测「分析崩溃」联动

## Phase 3 · 质量

- [x] 3.1 i18n zh-CN / en-US
- [x] 3.2 单测 + `test:contracts` + `verify:local`（`verify:local` 未全量跑；见 phase3 report）

## Phase 4 · 文档

- [x] 4.1 `quickstart.md` + 更新需求 Spec 状态
