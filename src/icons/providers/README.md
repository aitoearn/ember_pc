# Provider 图标系统

Provider 图标组件和资源文件。

## 文件索引

| 文件 | 描述 |
|------|------|
| `index.tsx` | Provider 图标组件，统一的图标渲染接口 |
| `utils.ts` | 图标辅助函数，Provider ID 到图标名称的映射 |
| `*.svg` | SVG 图标资源文件 |

## 使用方法

```tsx
import { ProviderIcon } from '@/icons/providers';

// 基本用法
<ProviderIcon providerType="openai" size={24} />

// 使用字符串大小
<ProviderIcon providerType="deepseek" size="1.5rem" />

// 禁用 fallback
<ProviderIcon providerType="custom" showFallback={false} />
```

## 支持的 Provider

### 主流 AI
- openai, anthropic, gemini, deepseek, moonshot
- groq, grok, mistral, perplexity, cohere

### 国内 AI
- zhipu, baichuan, dashscope, stepfun, doubao
- minimax, yi, hunyuan, tencent-cloud-ti, baidu-cloud
- infini, modelscope, xirang, mimo, zhinao

### 云服务
- azure-openai, vertexai, aws-bedrock, github, copilot

### API 聚合
- silicon, openrouter, aihubmix, 302ai, together
- fireworks, nvidia, hyperbolic, cerebras, ppio
- 等 25+ 服务

### 本地服务
- ollama, lmstudio, new-api, gpustack, ovms

### 专用服务
- jina, voyageai, cherryin

## 添加新图标

1. 将 SVG 文件添加到此目录
2. 在 `utils.ts` 的 `availableIcons` 数组中添加图标名称
3. 在 `utils.ts` 的 `providerTypeToIcon` 映射中添加 Provider ID 到图标名称的映射
4. 在 `index.tsx` 中导入 SVG 并添加到 `iconComponents` 映射

## 图标规范

- 格式：SVG
- 大小：建议使用 `height="1em" width="1em"` 以支持响应式
- 颜色：使用 `fill="currentColor"` 以支持主题切换
- 命名：使用小写字母和连字符，如 `azure-openai.svg`
