//! 确定性可复现测试流与自愈回放协议类型（wire 契约，camelCase）。
//!
//! 与前端 `src/features/device-automation/flow/domain/flowFormat.ts` 对齐。
//! 枚举字段（platform/source/op/locator.kind/conclusion/status/resolution）
//! 以 `String` 承载字面量，避免跨语言枚举序列化耦合。时间字段为 RFC3339
//! 字符串。`steps` 在 SQLite 内联 `steps_json`，由 App Server 在协议边界与
//! 持久化层互转；`args` / `assert.expr` 以 `serde_json::Value` 保真往返。

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

// ============================================================================
// 实体
// ============================================================================

/// 归一化视觉锚点坐标（0–1000 体系，与既有 UI Agent 归一化坐标一致）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowVlmAnchor {
    pub x_norm: f64,
    pub y_norm: f64,
}

/// 多策略定位中的单条定位。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowLocator {
    /// resource_id / text / accessibility_id / ui_tree_path / vlm_anchor。
    pub kind: String,
    #[serde(default)]
    pub value: String,
    /// 文案匹配：exact / contains。
    #[serde(default, rename = "match", skip_serializing_if = "Option::is_none")]
    pub text_match: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vlm_anchor: Option<FlowVlmAnchor>,
}

/// 断言：`type` ∈ {hard,soft}，`expr` 结构随类型而定（保真往返）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowAssertion {
    #[serde(rename = "type")]
    pub assertion_type: String,
    #[serde(default)]
    pub expr: Value,
}

/// 单步等待策略。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowWaitPolicy {
    pub stabilize_ms: i64,
    pub timeout_ms: i64,
}

/// 结构化流步骤。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowStep {
    /// 步骤序号，从 0 起连续。
    pub index: u32,
    pub op: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locators: Option<Vec<FlowLocator>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub args: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assert: Option<FlowAssertion>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wait: Option<FlowWaitPolicy>,
    /// 自然语言意图，自愈时喂给 VLM。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
}

/// 一条可确定性回放的测试流。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestFlow {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub app_package: String,
    #[serde(default)]
    pub platform: String,
    pub format_version: i64,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub self_healing_enabled: bool,
    #[serde(default)]
    pub steps: Vec<FlowStep>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// 一次确定性回放的留痕。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowRun {
    pub id: String,
    pub flow_id: String,
    pub workspace_id: String,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub started_at: String,
    /// 结束时间（RFC3339）；未结束为 null。
    #[serde(default)]
    pub finished_at: Option<String>,
    /// passed / failed / blocked。
    #[serde(default)]
    pub conclusion: String,
    #[serde(default)]
    pub healing_triggered: bool,
    /// 大模型 token 消耗；纯确定性回放应为 0，自愈步另计。
    #[serde(default)]
    pub llm_token_used: i64,
    #[serde(default)]
    pub summary: String,
}

/// 回放步骤实际使用的定位（精简引用）。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowLocatorRef {
    pub kind: String,
    pub value: String,
}

/// 回放步骤断言判定结果。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowAssertResult {
    pub ok: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// 回放过程中的一步留痕。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FlowRunStep {
    pub run_id: String,
    pub index: u32,
    #[serde(default)]
    pub op: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locator_used: Option<FlowLocatorRef>,
    /// passed / failed / blocked / healed。
    #[serde(default)]
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assert_result: Option<FlowAssertResult>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screenshot_path: Option<String>,
    #[serde(default)]
    pub duration_ms: i64,
}

/// 一次自愈产生的待确认修订。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct HealingRevision {
    pub id: String,
    pub flow_id: String,
    pub step_index: u32,
    pub run_id: String,
    #[serde(default)]
    pub original_locators: Vec<FlowLocator>,
    #[serde(default)]
    pub healed_locator: FlowLocator,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub evidence_screenshot_path: Option<String>,
    /// pending / accepted / flagged_defect。
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub created_at: String,
}

// ============================================================================
// deviceFlow/* 参数与响应（流 CRUD）
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowListParams {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowListResponse {
    #[serde(default)]
    pub flows: Vec<TestFlow>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowReadParams {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub flow: Option<TestFlow>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowSaveParams {
    pub flow: TestFlow,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowSaveResponse {
    pub flow: TestFlow,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowDeleteParams {
    #[serde(default)]
    pub ids: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowDeleteResponse {
    pub deleted: u32,
}

// ============================================================================
// deviceFlowRun/* 参数与响应（回放记录）
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunSaveParams {
    pub run: FlowRun,
    #[serde(default)]
    pub steps: Vec<FlowRunStep>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunSaveResponse {
    pub run_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunListParams {
    pub flow_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunListResponse {
    #[serde(default)]
    pub runs: Vec<FlowRun>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunReadParams {
    pub run_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowRunReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run: Option<FlowRun>,
    #[serde(default)]
    pub steps: Vec<FlowRunStep>,
}

// ============================================================================
// deviceFlowHealing/* 参数与响应（自愈修订）
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingListParams {
    pub flow_id: String,
    /// pending / accepted / flagged_defect；缺省返回全部。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingListResponse {
    #[serde(default)]
    pub revisions: Vec<HealingRevision>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingSaveParams {
    pub revision: HealingRevision,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingSaveResponse {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingResolveParams {
    pub id: String,
    /// accepted / flagged_defect。
    pub resolution: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowHealingResolveResponse {
    pub revision: HealingRevision,
    /// accepted 并入定位后回传新流；flagged_defect 为 null。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub flow: Option<TestFlow>,
}
