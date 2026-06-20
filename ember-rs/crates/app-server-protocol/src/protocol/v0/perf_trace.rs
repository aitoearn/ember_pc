//! P2 · Perfetto trace artifact 与分析结果协议类型（wire 契约，camelCase）。
//!
//! 与前端 `src/features/device-automation/performance/types.ts` 对齐。

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Perfetto trace 文件元数据。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceTraceArtifact {
    pub id: String,
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub linked_session_id: Option<String>,
    pub device_id: String,
    pub device_platform: String,
    pub package_name: String,
    pub preset_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config_json: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub remote_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(default)]
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stopped_at: Option<String>,
}

/// Trace L1 分析结果。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceTraceAnalysis {
    pub id: String,
    pub artifact_id: String,
    pub analysis_type: String,
    pub package_name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_range_json: Option<String>,
    #[serde(default)]
    pub result_json: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceSaveParams {
    pub artifact: PerformanceTraceArtifact,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceSaveResponse {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceListParams {
    pub workspace_id: String,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(default)]
    pub offset: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceListResponse {
    #[serde(default)]
    pub artifacts: Vec<PerformanceTraceArtifact>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceReadParams {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact: Option<PerformanceTraceArtifact>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceDeleteParams {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceDeleteResponse {
    pub deleted: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceAnalysisSaveParams {
    pub analysis: PerformanceTraceAnalysis,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceAnalysisSaveResponse {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceAnalysisListParams {
    pub artifact_id: String,
    #[serde(default)]
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PerfMonitorTraceAnalysisListResponse {
    #[serde(default)]
    pub analyses: Vec<PerformanceTraceAnalysis>,
}
