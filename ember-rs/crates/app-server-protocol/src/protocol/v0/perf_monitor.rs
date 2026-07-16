//! 移动端性能监控会话协议类型（wire 契约，camelCase）。
//!
//! 与前端 `src/features/device-automation/performance/types.ts` 对齐。
//! 采集技术细节见 `specs/002-device-performance-monitor/collection-architecture.md`。

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 单指标摘要（AVG/MAX/MIN）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMetricSummary {
    pub avg: f64,
    pub max: f64,
    pub min: f64,
}

/// 一次性能采集会话。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSession {
    pub id: String,
    pub workspace_id: String,
    pub device_id: String,
    pub device_platform: String,
    pub package_name: String,
    #[serde(default)]
    pub metrics: Vec<String>,
    #[serde(default = "default_interval_ms")]
    pub interval_ms: i64,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub started_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stopped_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<HashMap<String, PerfMetricSummary>>,
}

fn default_interval_ms() -> i64 {
    1000
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionSaveParams {
    pub session: PerformanceSession,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionSaveResponse {
    pub session: PerformanceSession,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionListParams {
    pub workspace_id: String,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(default)]
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionListResponse {
    #[serde(default)]
    pub sessions: Vec<PerformanceSession>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionReadParams {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorSessionReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<PerformanceSession>,
}
