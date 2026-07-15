# Stability Assurance — Phase 3 Fix Report

## 问题

从压测（Monkey）联动打开崩溃分析时，`useCrashAnalysis` 将 `prefill.localResultDir`（压测结果目录）错误写入 `form.libraryDir`（符号库目录）。二者语义不同，会导致 sa-agent 使用错误路径启动分析。

## 修复

1. **预填逻辑拆分**（`crashAnalysisPrefill.ts`）
   - 新增纯函数 `applyCrashAnalysisPrefill`：仅预填 `crashLogPath`
   - `localResultDir` 单独返回，供 UI 展示上下文，**不**写入 `libraryDir`

2. **`useCrashAnalysis`**
   - 使用 `applyCrashAnalysisPrefill` 更新表单
   - 暴露 `prefillLocalResultDir` 给工具栏展示

3. **`CrashAnalysisToolbar`**
   - 当存在压测结果目录时，显示上下文提示条与「打开压测结果目录」按钮
   - 中英文 i18n 已同步（zh-CN / en-US）

4. **取消分析投影**（`stabilityAnalysisProjection.ts`）
   - 取消类消息（含「已取消」/ canceled）不再写入 `errorMessage`，按正常结束处理

## 测试

```bash
npx vitest run src/features/device-automation/stability/domain/stabilityAnalysisProjection.unit.test.ts
```

新增/调整用例：
- `applyCrashAnalysisPrefill` 不污染 `libraryDir`
- `isCanceledAnalysisMessage` 识别取消文案
- 取消类 `error` 事件不设置 `errorMessage`

## 涉及文件

- `src/features/device-automation/stability/domain/crashAnalysisPrefill.ts`（新增）
- `src/features/device-automation/stability/domain/stabilityAnalysisProjection.ts`
- `src/features/device-automation/stability/domain/stabilityAnalysisProjection.unit.test.ts`
- `src/features/device-automation/stability/hooks/useCrashAnalysis.ts`
- `src/features/device-automation/stability/components/CrashAnalysisPanel.tsx`
- `src/features/device-automation/stability/components/CrashAnalysisToolbar.tsx`
- `src/i18n/resources/zh-CN/deviceAutomation.json`
- `src/i18n/resources/en-US/deviceAutomation.json`
