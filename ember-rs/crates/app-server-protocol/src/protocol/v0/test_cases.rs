//! 测试用例管理协议类型（wire 契约，camelCase）。
//!
//! 与前端 `src/features/test-case-management/types.ts` 对齐。枚举字段
//! （priority/caseType/status/source/execResult/result）以 `String` 承载
//! 中文字面量，避免跨语言枚举序列化耦合。时间字段为 RFC3339 字符串，
//! 由 App Server 在协议边界与 SQLite 的毫秒时间戳互转。

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// ============================================================================
// 实体
// ============================================================================

/// 结构化测试步骤：步骤号 + 操作 + 预期。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseStep {
    pub step_no: u32,
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub expected: String,
}

/// 单条测试用例。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCase {
    pub id: String,
    pub case_id: String,
    pub title: String,
    #[serde(default)]
    pub module_id: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub case_type: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub precondition: String,
    #[serde(default)]
    pub steps: Vec<TestCaseStep>,
    /// 断言/通过条件（与步骤分离的独立验证项）。
    #[serde(default)]
    pub assertions: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub exec_result: String,
    #[serde(default)]
    pub remark: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// 树形测试模块节点。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModule {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub order_index: i64,
}

// ============================================================================
// testCase/* 参数与响应
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseListParams {
    pub workspace_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub module_id: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseListResponse {
    #[serde(default)]
    pub cases: Vec<TestCase>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseReadParams {
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseReadResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub case: Option<TestCase>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseSaveParams {
    pub workspace_id: String,
    pub case: TestCase,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseSaveResponse {
    pub case: TestCase,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseDeleteParams {
    #[serde(default)]
    pub ids: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseDeleteResponse {
    pub deleted: u32,
}

// ============================================================================
// testCaseModule/* 参数与响应
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleListParams {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleListResponse {
    #[serde(default)]
    pub modules: Vec<TestCaseModule>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleSaveParams {
    pub workspace_id: String,
    pub module: TestCaseModule,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleSaveResponse {
    pub module: TestCaseModule,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleDeleteParams {
    pub workspace_id: String,
    pub id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseModuleDeleteResponse {
    pub deleted: bool,
}

// ============================================================================
// 执行记录实体（US3）
// ============================================================================

/// 执行过程中的一步观察。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRunStep {
    pub id: String,
    #[serde(default)]
    pub run_id: String,
    pub step_no: u32,
    #[serde(default)]
    pub observation: String,
    #[serde(default)]
    pub screenshot_path: String,
    #[serde(default)]
    pub ts: String,
}

/// 单条用例的一次执行记录。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRun {
    pub id: String,
    /// 关联的用例内部 id（test_cases.id）。
    pub case_id: String,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub instruction: String,
    /// 判定结果：通过 / 失败 / 阻塞。
    #[serde(default)]
    pub result: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub started_at: String,
    /// 结束时间（RFC3339）；未结束为空串。
    #[serde(default)]
    pub finished_at: String,
    #[serde(default)]
    pub steps: Vec<TestCaseRunStep>,
}

// ============================================================================
// testCaseRun/* 参数与响应（US3）
// ============================================================================

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRunSaveParams {
    pub workspace_id: String,
    pub run: TestCaseRun,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRunSaveResponse {
    pub run: TestCaseRun,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRunListParams {
    pub workspace_id: String,
    pub case_id: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TestCaseRunListResponse {
    #[serde(default)]
    pub runs: Vec<TestCaseRun>,
}
