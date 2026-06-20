# config

<!-- 一旦我所属的文件夹有所变化，请更新我 -->

## 架构说明

前端配置模块，包含各功能模块的静态配置定义。

## 文件索引

- `providers.ts` - System Provider 预设配置（Requirements 3.1-3.6）
  - `PROVIDER_GROUPS` - Provider 分组配置
  - `SYSTEM_PROVIDERS` - 60+ 系统预设 Provider 配置
  - `getSystemProviderIds()` - 获取所有 Provider ID
  - `getProvidersByGroup()` - 按分组获取 Provider
  - `getProvidersGrouped()` - 获取分组后的 Provider
  - `isSystemProviderId()` - 检查是否为系统 Provider
  - `getSystemProvider()` - 获取指定 Provider 配置
  - `getSystemProviderCount()` - 获取 Provider 总数

## 更新提醒

任何文件变更后，请更新此文档和相关的上级文档。
