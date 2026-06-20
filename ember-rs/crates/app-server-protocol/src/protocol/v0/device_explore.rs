//! 工作区探索压测配置（Kea2 对齐：property / invariant 规则 + 探索配置）。
//!
//! 规则与配置以 JSON 存储，wire 层用 `serde_json::Value` 保真 TS 结构。

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreProfile {
    pub workspace_id: String,
    #[serde(default)]
    pub rules: Vec<serde_json::Value>,
    #[serde(default)]
    pub config: serde_json::Value,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreReadParams {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profile: Option<DeviceExploreProfile>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreSaveParams {
    pub profile: DeviceExploreProfile,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreSaveResponse {
    pub profile: DeviceExploreProfile,
}

// ============================================================================
// deviceExploreRun/* 参数与响应（探索压测运行留痕）
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExploreRun {
    pub id: String,
    pub workspace_id: String,
    #[serde(default)]
    pub session_id: String,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub package_name: String,
    #[serde(default)]
    pub engine_mode: String,
    pub started_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<String>,
    #[serde(default)]
    pub conclusion: String,
    #[serde(default)]
    pub event_count: i64,
    #[serde(default)]
    pub throttle_ms: i64,
    #[serde(default)]
    pub running_minutes: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    #[serde(default)]
    pub events_injected: i64,
    #[serde(default)]
    pub crash_count: i64,
    #[serde(default)]
    pub anr_count: i64,
    #[serde(default)]
    pub explore_rules_count: i64,
    #[serde(default)]
    pub rule_failures_count: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub local_result_dir: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bug_report_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_log_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps_summary: Option<serde_json::Value>,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunSaveParams {
    pub run: ExploreRun,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunSaveResponse {
    pub run_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunListParams {
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunListResponse {
    #[serde(default)]
    pub runs: Vec<ExploreRun>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunReadParams {
    pub run_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceExploreRunReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run: Option<ExploreRun>,
}
