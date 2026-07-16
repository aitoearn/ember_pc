#!/usr/bin/env node
/**
 * 将 main@2665fa7 测试平台 Rust 模块挂入 Lime v1.105 App Server 结构。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const RS = (...parts) => path.join(ROOT, "ember-rs/crates/app-server/src", ...parts);
const PROTO = (...parts) =>
  path.join(ROOT, "ember-rs/crates/app-server-protocol/src/protocol/v0", ...parts);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function insertAfter(content, marker, insertion) {
  if (content.includes(insertion.trim().split("\n")[0])) {
    return content;
  }
  const index = content.indexOf(marker);
  if (index < 0) {
    throw new Error(`找不到插入锚点: ${marker}`);
  }
  const at = index + marker.length;
  return `${content.slice(0, at)}\n${insertion}${content.slice(at)}`;
}

function insertBefore(content, marker, insertion) {
  if (content.includes(insertion.trim().split("\n")[0])) {
    return content;
  }
  const index = content.indexOf(marker);
  if (index < 0) {
    throw new Error(`找不到插入锚点: ${marker}`);
  }
  return `${content.slice(0, index)}${insertion}${content.slice(index)}`;
}

const METHOD_NAMES_BLOCK = `
// 测试用例管理（testCase / testCaseModule）
pub const METHOD_TEST_CASE_LIST: &str = "testCase/list";
pub const METHOD_TEST_CASE_READ: &str = "testCase/read";
pub const METHOD_TEST_CASE_SAVE: &str = "testCase/save";
pub const METHOD_TEST_CASE_DELETE: &str = "testCase/delete";
pub const METHOD_TEST_CASE_MODULE_LIST: &str = "testCaseModule/list";
pub const METHOD_TEST_CASE_MODULE_SAVE: &str = "testCaseModule/save";
pub const METHOD_TEST_CASE_MODULE_DELETE: &str = "testCaseModule/delete";
pub const METHOD_TEST_CASE_RUN_SAVE: &str = "testCaseRun/save";
pub const METHOD_TEST_CASE_RUN_LIST: &str = "testCaseRun/list";

// 移动端性能监控（perfMonitor/session/*）
pub const METHOD_PERF_MONITOR_SESSION_SAVE: &str = "perfMonitor/session/save";
pub const METHOD_PERF_MONITOR_SESSION_LIST: &str = "perfMonitor/session/list";
pub const METHOD_PERF_MONITOR_SESSION_READ: &str = "perfMonitor/session/read";

// Perfetto trace artifact 与分析
pub const METHOD_PERF_MONITOR_TRACE_SAVE: &str = "perfMonitor/trace/save";
pub const METHOD_PERF_MONITOR_TRACE_LIST: &str = "perfMonitor/trace/list";
pub const METHOD_PERF_MONITOR_TRACE_READ: &str = "perfMonitor/trace/read";
pub const METHOD_PERF_MONITOR_TRACE_DELETE: &str = "perfMonitor/trace/delete";
pub const METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE: &str = "perfMonitor/traceAnalysis/save";
pub const METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST: &str = "perfMonitor/traceAnalysis/list";

// 确定性可复现测试流与自愈回放
pub const METHOD_DEVICE_FLOW_LIST: &str = "deviceFlow/list";
pub const METHOD_DEVICE_FLOW_READ: &str = "deviceFlow/read";
pub const METHOD_DEVICE_FLOW_SAVE: &str = "deviceFlow/save";
pub const METHOD_DEVICE_FLOW_DELETE: &str = "deviceFlow/delete";
pub const METHOD_DEVICE_FLOW_RUN_SAVE: &str = "deviceFlowRun/save";
pub const METHOD_DEVICE_FLOW_RUN_LIST: &str = "deviceFlowRun/list";
pub const METHOD_DEVICE_FLOW_RUN_READ: &str = "deviceFlowRun/read";
pub const METHOD_DEVICE_FLOW_HEALING_LIST: &str = "deviceFlowHealing/list";
pub const METHOD_DEVICE_FLOW_HEALING_SAVE: &str = "deviceFlowHealing/save";
pub const METHOD_DEVICE_FLOW_HEALING_RESOLVE: &str = "deviceFlowHealing/resolve";

pub const METHOD_DEVICE_EXPLORE_READ: &str = "deviceExplore/read";
pub const METHOD_DEVICE_EXPLORE_SAVE: &str = "deviceExplore/save";
pub const METHOD_DEVICE_EXPLORE_RUN_SAVE: &str = "deviceExploreRun/save";
pub const METHOD_DEVICE_EXPLORE_RUN_LIST: &str = "deviceExploreRun/list";
pub const METHOD_DEVICE_EXPLORE_RUN_READ: &str = "deviceExploreRun/read";
`;

const CATALOG_ENUM_BLOCK = `
    #[serde(rename = "testCase/list")]
    TestCaseList,
    #[serde(rename = "testCase/read")]
    TestCaseRead,
    #[serde(rename = "testCase/save")]
    TestCaseSave,
    #[serde(rename = "testCase/delete")]
    TestCaseDelete,
    #[serde(rename = "testCaseModule/list")]
    TestCaseModuleList,
    #[serde(rename = "testCaseModule/save")]
    TestCaseModuleSave,
    #[serde(rename = "testCaseModule/delete")]
    TestCaseModuleDelete,
    #[serde(rename = "testCaseRun/save")]
    TestCaseRunSave,
    #[serde(rename = "testCaseRun/list")]
    TestCaseRunList,
    #[serde(rename = "perfMonitor/session/save")]
    PerfMonitorSessionSave,
    #[serde(rename = "perfMonitor/session/list")]
    PerfMonitorSessionList,
    #[serde(rename = "perfMonitor/session/read")]
    PerfMonitorSessionRead,
    #[serde(rename = "perfMonitor/trace/save")]
    PerfMonitorTraceSave,
    #[serde(rename = "perfMonitor/trace/list")]
    PerfMonitorTraceList,
    #[serde(rename = "perfMonitor/trace/read")]
    PerfMonitorTraceRead,
    #[serde(rename = "perfMonitor/trace/delete")]
    PerfMonitorTraceDelete,
    #[serde(rename = "perfMonitor/traceAnalysis/save")]
    PerfMonitorTraceAnalysisSave,
    #[serde(rename = "perfMonitor/traceAnalysis/list")]
    PerfMonitorTraceAnalysisList,
    #[serde(rename = "deviceFlow/list")]
    DeviceFlowList,
    #[serde(rename = "deviceFlow/read")]
    DeviceFlowRead,
    #[serde(rename = "deviceFlow/save")]
    DeviceFlowSave,
    #[serde(rename = "deviceFlow/delete")]
    DeviceFlowDelete,
    #[serde(rename = "deviceFlowRun/save")]
    DeviceFlowRunSave,
    #[serde(rename = "deviceFlowRun/list")]
    DeviceFlowRunList,
    #[serde(rename = "deviceFlowRun/read")]
    DeviceFlowRunRead,
    #[serde(rename = "deviceFlowHealing/list")]
    DeviceFlowHealingList,
    #[serde(rename = "deviceFlowHealing/save")]
    DeviceFlowHealingSave,
    #[serde(rename = "deviceFlowHealing/resolve")]
    DeviceFlowHealingResolve,
    #[serde(rename = "deviceExplore/read")]
    DeviceExploreRead,
    #[serde(rename = "deviceExplore/save")]
    DeviceExploreSave,
    #[serde(rename = "deviceExploreRun/save")]
    DeviceExploreRunSave,
    #[serde(rename = "deviceExploreRun/list")]
    DeviceExploreRunList,
    #[serde(rename = "deviceExploreRun/read")]
    DeviceExploreRunRead,`;

const CATALOG_AS_STR_BLOCK = `
            Self::TestCaseList => METHOD_TEST_CASE_LIST,
            Self::TestCaseRead => METHOD_TEST_CASE_READ,
            Self::TestCaseSave => METHOD_TEST_CASE_SAVE,
            Self::TestCaseDelete => METHOD_TEST_CASE_DELETE,
            Self::TestCaseModuleList => METHOD_TEST_CASE_MODULE_LIST,
            Self::TestCaseModuleSave => METHOD_TEST_CASE_MODULE_SAVE,
            Self::TestCaseModuleDelete => METHOD_TEST_CASE_MODULE_DELETE,
            Self::TestCaseRunSave => METHOD_TEST_CASE_RUN_SAVE,
            Self::TestCaseRunList => METHOD_TEST_CASE_RUN_LIST,
            Self::PerfMonitorSessionSave => METHOD_PERF_MONITOR_SESSION_SAVE,
            Self::PerfMonitorSessionList => METHOD_PERF_MONITOR_SESSION_LIST,
            Self::PerfMonitorSessionRead => METHOD_PERF_MONITOR_SESSION_READ,
            Self::PerfMonitorTraceSave => METHOD_PERF_MONITOR_TRACE_SAVE,
            Self::PerfMonitorTraceList => METHOD_PERF_MONITOR_TRACE_LIST,
            Self::PerfMonitorTraceRead => METHOD_PERF_MONITOR_TRACE_READ,
            Self::PerfMonitorTraceDelete => METHOD_PERF_MONITOR_TRACE_DELETE,
            Self::PerfMonitorTraceAnalysisSave => METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE,
            Self::PerfMonitorTraceAnalysisList => METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST,
            Self::DeviceFlowList => METHOD_DEVICE_FLOW_LIST,
            Self::DeviceFlowRead => METHOD_DEVICE_FLOW_READ,
            Self::DeviceFlowSave => METHOD_DEVICE_FLOW_SAVE,
            Self::DeviceFlowDelete => METHOD_DEVICE_FLOW_DELETE,
            Self::DeviceFlowRunSave => METHOD_DEVICE_FLOW_RUN_SAVE,
            Self::DeviceFlowRunList => METHOD_DEVICE_FLOW_RUN_LIST,
            Self::DeviceFlowRunRead => METHOD_DEVICE_FLOW_RUN_READ,
            Self::DeviceFlowHealingList => METHOD_DEVICE_FLOW_HEALING_LIST,
            Self::DeviceFlowHealingSave => METHOD_DEVICE_FLOW_HEALING_SAVE,
            Self::DeviceFlowHealingResolve => METHOD_DEVICE_FLOW_HEALING_RESOLVE,
            Self::DeviceExploreRead => METHOD_DEVICE_EXPLORE_READ,
            Self::DeviceExploreSave => METHOD_DEVICE_EXPLORE_SAVE,
            Self::DeviceExploreRunSave => METHOD_DEVICE_EXPLORE_RUN_SAVE,
            Self::DeviceExploreRunList => METHOD_DEVICE_EXPLORE_RUN_LIST,
            Self::DeviceExploreRunRead => METHOD_DEVICE_EXPLORE_RUN_READ,`;

const CATALOG_PARSE_BLOCK = `
            METHOD_TEST_CASE_LIST => Some(Self::TestCaseList),
            METHOD_TEST_CASE_READ => Some(Self::TestCaseRead),
            METHOD_TEST_CASE_SAVE => Some(Self::TestCaseSave),
            METHOD_TEST_CASE_DELETE => Some(Self::TestCaseDelete),
            METHOD_TEST_CASE_MODULE_LIST => Some(Self::TestCaseModuleList),
            METHOD_TEST_CASE_MODULE_SAVE => Some(Self::TestCaseModuleSave),
            METHOD_TEST_CASE_MODULE_DELETE => Some(Self::TestCaseModuleDelete),
            METHOD_TEST_CASE_RUN_SAVE => Some(Self::TestCaseRunSave),
            METHOD_TEST_CASE_RUN_LIST => Some(Self::TestCaseRunList),
            METHOD_PERF_MONITOR_SESSION_SAVE => Some(Self::PerfMonitorSessionSave),
            METHOD_PERF_MONITOR_SESSION_LIST => Some(Self::PerfMonitorSessionList),
            METHOD_PERF_MONITOR_SESSION_READ => Some(Self::PerfMonitorSessionRead),
            METHOD_PERF_MONITOR_TRACE_SAVE => Some(Self::PerfMonitorTraceSave),
            METHOD_PERF_MONITOR_TRACE_LIST => Some(Self::PerfMonitorTraceList),
            METHOD_PERF_MONITOR_TRACE_READ => Some(Self::PerfMonitorTraceRead),
            METHOD_PERF_MONITOR_TRACE_DELETE => Some(Self::PerfMonitorTraceDelete),
            METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE => Some(Self::PerfMonitorTraceAnalysisSave),
            METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST => Some(Self::PerfMonitorTraceAnalysisList),
            METHOD_DEVICE_FLOW_LIST => Some(Self::DeviceFlowList),
            METHOD_DEVICE_FLOW_READ => Some(Self::DeviceFlowRead),
            METHOD_DEVICE_FLOW_SAVE => Some(Self::DeviceFlowSave),
            METHOD_DEVICE_FLOW_DELETE => Some(Self::DeviceFlowDelete),
            METHOD_DEVICE_FLOW_RUN_SAVE => Some(Self::DeviceFlowRunSave),
            METHOD_DEVICE_FLOW_RUN_LIST => Some(Self::DeviceFlowRunList),
            METHOD_DEVICE_FLOW_RUN_READ => Some(Self::DeviceFlowRunRead),
            METHOD_DEVICE_FLOW_HEALING_LIST => Some(Self::DeviceFlowHealingList),
            METHOD_DEVICE_FLOW_HEALING_SAVE => Some(Self::DeviceFlowHealingSave),
            METHOD_DEVICE_FLOW_HEALING_RESOLVE => Some(Self::DeviceFlowHealingResolve),
            METHOD_DEVICE_EXPLORE_READ => Some(Self::DeviceExploreRead),
            METHOD_DEVICE_EXPLORE_SAVE => Some(Self::DeviceExploreSave),
            METHOD_DEVICE_EXPLORE_RUN_SAVE => Some(Self::DeviceExploreRunSave),
            METHOD_DEVICE_EXPLORE_RUN_LIST => Some(Self::DeviceExploreRunList),
            METHOD_DEVICE_EXPLORE_RUN_READ => Some(Self::DeviceExploreRunRead),`;

const CLIENT_REQUEST_BLOCK = `
    TestCaseList => "testCase/list",
    TestCaseRead => "testCase/read",
    TestCaseSave => "testCase/save",
    TestCaseDelete => "testCase/delete",
    TestCaseModuleList => "testCaseModule/list",
    TestCaseModuleSave => "testCaseModule/save",
    TestCaseModuleDelete => "testCaseModule/delete",
    TestCaseRunSave => "testCaseRun/save",
    TestCaseRunList => "testCaseRun/list",
    PerfMonitorSessionSave => "perfMonitor/session/save",
    PerfMonitorSessionList => "perfMonitor/session/list",
    PerfMonitorSessionRead => "perfMonitor/session/read",
    PerfMonitorTraceSave => "perfMonitor/trace/save",
    PerfMonitorTraceList => "perfMonitor/trace/list",
    PerfMonitorTraceRead => "perfMonitor/trace/read",
    PerfMonitorTraceDelete => "perfMonitor/trace/delete",
    PerfMonitorTraceAnalysisSave => "perfMonitor/traceAnalysis/save",
    PerfMonitorTraceAnalysisList => "perfMonitor/traceAnalysis/list",
    DeviceFlowList => "deviceFlow/list",
    DeviceFlowRead => "deviceFlow/read",
    DeviceFlowSave => "deviceFlow/save",
    DeviceFlowDelete => "deviceFlow/delete",
    DeviceFlowRunSave => "deviceFlowRun/save",
    DeviceFlowRunList => "deviceFlowRun/list",
    DeviceFlowRunRead => "deviceFlowRun/read",
    DeviceFlowHealingList => "deviceFlowHealing/list",
    DeviceFlowHealingSave => "deviceFlowHealing/save",
    DeviceFlowHealingResolve => "deviceFlowHealing/resolve",
    DeviceExploreRead => "deviceExplore/read",
    DeviceExploreSave => "deviceExplore/save",
    DeviceExploreRunSave => "deviceExploreRun/save",
    DeviceExploreRunList => "deviceExploreRun/list",
    DeviceExploreRunRead => "deviceExploreRun/read",`;

const DISPATCH_BLOCK = `
            METHOD_TEST_CASE_LIST => self.handle_test_case_list_impl(params).await,
            METHOD_TEST_CASE_READ => self.handle_test_case_read_impl(params).await,
            METHOD_TEST_CASE_SAVE => self.handle_test_case_save_impl(params).await,
            METHOD_TEST_CASE_DELETE => self.handle_test_case_delete_impl(params).await,
            METHOD_TEST_CASE_MODULE_LIST => self.handle_test_case_module_list_impl(params).await,
            METHOD_TEST_CASE_MODULE_SAVE => self.handle_test_case_module_save_impl(params).await,
            METHOD_TEST_CASE_MODULE_DELETE => self.handle_test_case_module_delete_impl(params).await,
            METHOD_TEST_CASE_RUN_SAVE => self.handle_test_case_run_save_impl(params).await,
            METHOD_TEST_CASE_RUN_LIST => self.handle_test_case_run_list_impl(params).await,
            METHOD_PERF_MONITOR_SESSION_SAVE => self.handle_perf_monitor_session_save_impl(params).await,
            METHOD_PERF_MONITOR_SESSION_LIST => self.handle_perf_monitor_session_list_impl(params).await,
            METHOD_PERF_MONITOR_SESSION_READ => self.handle_perf_monitor_session_read_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_SAVE => self.handle_perf_monitor_trace_save_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_LIST => self.handle_perf_monitor_trace_list_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_READ => self.handle_perf_monitor_trace_read_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_DELETE => self.handle_perf_monitor_trace_delete_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_ANALYSIS_SAVE => self.handle_perf_monitor_trace_analysis_save_impl(params).await,
            METHOD_PERF_MONITOR_TRACE_ANALYSIS_LIST => self.handle_perf_monitor_trace_analysis_list_impl(params).await,
            METHOD_DEVICE_FLOW_LIST => self.handle_device_flow_list_impl(params).await,
            METHOD_DEVICE_FLOW_READ => self.handle_device_flow_read_impl(params).await,
            METHOD_DEVICE_FLOW_SAVE => self.handle_device_flow_save_impl(params).await,
            METHOD_DEVICE_FLOW_DELETE => self.handle_device_flow_delete_impl(params).await,
            METHOD_DEVICE_FLOW_RUN_SAVE => self.handle_device_flow_run_save_impl(params).await,
            METHOD_DEVICE_FLOW_RUN_LIST => self.handle_device_flow_run_list_impl(params).await,
            METHOD_DEVICE_FLOW_RUN_READ => self.handle_device_flow_run_read_impl(params).await,
            METHOD_DEVICE_FLOW_HEALING_LIST => self.handle_device_flow_healing_list_impl(params).await,
            METHOD_DEVICE_FLOW_HEALING_SAVE => self.handle_device_flow_healing_save_impl(params).await,
            METHOD_DEVICE_FLOW_HEALING_RESOLVE => self.handle_device_flow_healing_resolve_impl(params).await,
            METHOD_DEVICE_EXPLORE_READ => self.handle_device_explore_read_impl(params).await,
            METHOD_DEVICE_EXPLORE_SAVE => self.handle_device_explore_save_impl(params).await,
            METHOD_DEVICE_EXPLORE_RUN_SAVE => self.handle_device_explore_run_save_impl(params).await,
            METHOD_DEVICE_EXPLORE_RUN_LIST => self.handle_device_explore_run_list_impl(params).await,
            METHOD_DEVICE_EXPLORE_RUN_READ => self.handle_device_explore_run_read_impl(params).await,`;

function traitFile(name, title, methods) {
  return `use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait ${name}: Send + Sync {
${methods}
}

impl ${name} for NoopAppDataSource {}
`;
}

function syncDelegate(fn, args) {
  return `        Ok(super::super::${fn}(&self.db, ${args})?)`;
}

function asyncDelegate(fn, args) {
  return `        super::super::${fn}(&self.db, ${args}).await`;
}

function writeTraitAndRuntime() {
  const unavailableMethod = (op, params, ret) => `    async fn ${op}(
        &self,
        _params: ${params},
    ) -> Result<${ret}, RuntimeCoreError> {
        Err(unavailable("${op.replace(/_/g, "/")}"))
    }`;

  write(
    "ember-rs/crates/app-server/src/runtime/app_data/test_cases.rs",
    traitFile(
      "TestCasesAppDataSource",
      "测试用例",
      [
        unavailableMethod("list_test_cases", "TestCaseListParams", "TestCaseListResponse"),
        unavailableMethod("read_test_case", "TestCaseReadParams", "TestCaseReadResponse"),
        unavailableMethod("save_test_case", "TestCaseSaveParams", "TestCaseSaveResponse"),
        unavailableMethod("delete_test_cases", "TestCaseDeleteParams", "TestCaseDeleteResponse"),
        unavailableMethod(
          "list_test_case_modules",
          "TestCaseModuleListParams",
          "TestCaseModuleListResponse",
        ),
        unavailableMethod(
          "save_test_case_module",
          "TestCaseModuleSaveParams",
          "TestCaseModuleSaveResponse",
        ),
        unavailableMethod(
          "delete_test_case_module",
          "TestCaseModuleDeleteParams",
          "TestCaseModuleDeleteResponse",
        ),
        unavailableMethod(
          "save_test_case_run",
          "TestCaseRunSaveParams",
          "TestCaseRunSaveResponse",
        ),
        unavailableMethod(
          "list_test_case_runs",
          "TestCaseRunListParams",
          "TestCaseRunListResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/app_data/perf_monitor.rs",
    traitFile(
      "PerfMonitorAppDataSource",
      "性能监控 session",
      [
        unavailableMethod(
          "save_perf_monitor_session",
          "PerfMonitorSessionSaveParams",
          "PerfMonitorSessionSaveResponse",
        ),
        unavailableMethod(
          "list_perf_monitor_sessions",
          "PerfMonitorSessionListParams",
          "PerfMonitorSessionListResponse",
        ),
        unavailableMethod(
          "read_perf_monitor_session",
          "PerfMonitorSessionReadParams",
          "PerfMonitorSessionReadResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/app_data/perf_trace.rs",
    traitFile(
      "PerfTraceAppDataSource",
      "Perfetto trace",
      [
        unavailableMethod(
          "save_perf_monitor_trace",
          "PerfMonitorTraceSaveParams",
          "PerfMonitorTraceSaveResponse",
        ),
        unavailableMethod(
          "list_perf_monitor_traces",
          "PerfMonitorTraceListParams",
          "PerfMonitorTraceListResponse",
        ),
        unavailableMethod(
          "read_perf_monitor_trace",
          "PerfMonitorTraceReadParams",
          "PerfMonitorTraceReadResponse",
        ),
        unavailableMethod(
          "delete_perf_monitor_trace",
          "PerfMonitorTraceDeleteParams",
          "PerfMonitorTraceDeleteResponse",
        ),
        unavailableMethod(
          "save_perf_monitor_trace_analysis",
          "PerfMonitorTraceAnalysisSaveParams",
          "PerfMonitorTraceAnalysisSaveResponse",
        ),
        unavailableMethod(
          "list_perf_monitor_trace_analyses",
          "PerfMonitorTraceAnalysisListParams",
          "PerfMonitorTraceAnalysisListResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/app_data/device_flow.rs",
    traitFile(
      "DeviceFlowAppDataSource",
      "device flow",
      [
        unavailableMethod("list_device_flows", "DeviceFlowListParams", "DeviceFlowListResponse"),
        unavailableMethod("read_device_flow", "DeviceFlowReadParams", "DeviceFlowReadResponse"),
        unavailableMethod("save_device_flow", "DeviceFlowSaveParams", "DeviceFlowSaveResponse"),
        unavailableMethod(
          "delete_device_flows",
          "DeviceFlowDeleteParams",
          "DeviceFlowDeleteResponse",
        ),
        unavailableMethod(
          "save_device_flow_run",
          "DeviceFlowRunSaveParams",
          "DeviceFlowRunSaveResponse",
        ),
        unavailableMethod(
          "list_device_flow_runs",
          "DeviceFlowRunListParams",
          "DeviceFlowRunListResponse",
        ),
        unavailableMethod(
          "read_device_flow_run",
          "DeviceFlowRunReadParams",
          "DeviceFlowRunReadResponse",
        ),
        unavailableMethod(
          "list_device_flow_healing",
          "DeviceFlowHealingListParams",
          "DeviceFlowHealingListResponse",
        ),
        unavailableMethod(
          "save_device_flow_healing",
          "DeviceFlowHealingSaveParams",
          "DeviceFlowHealingSaveResponse",
        ),
        unavailableMethod(
          "resolve_device_flow_healing",
          "DeviceFlowHealingResolveParams",
          "DeviceFlowHealingResolveResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/app_data/device_explore.rs",
    traitFile(
      "DeviceExploreAppDataSource",
      "device explore",
      [
        unavailableMethod(
          "read_device_explore_profile",
          "DeviceExploreReadParams",
          "DeviceExploreReadResponse",
        ),
        unavailableMethod(
          "save_device_explore_profile",
          "DeviceExploreSaveParams",
          "DeviceExploreSaveResponse",
        ),
        unavailableMethod(
          "save_device_explore_run",
          "DeviceExploreRunSaveParams",
          "DeviceExploreRunSaveResponse",
        ),
        unavailableMethod(
          "list_device_explore_runs",
          "DeviceExploreRunListParams",
          "DeviceExploreRunListResponse",
        ),
        unavailableMethod(
          "read_device_explore_run",
          "DeviceExploreRunReadParams",
          "DeviceExploreRunReadResponse",
        ),
      ].join("\n\n"),
    ),
  );

  const runtimeForwarding = (methods) => `use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
${methods}
}
`;

  const forward = (name, params, ret) => `    pub async fn ${name}(
        &self,
        params: ${params},
    ) -> Result<${ret}, RuntimeCoreError> {
        self.app_data_source.${name}(params).await
    }`;

  write(
    "ember-rs/crates/app-server/src/runtime/test_cases.rs",
    runtimeForwarding(
      [
        forward("list_test_cases", "TestCaseListParams", "TestCaseListResponse"),
        forward("read_test_case", "TestCaseReadParams", "TestCaseReadResponse"),
        forward("save_test_case", "TestCaseSaveParams", "TestCaseSaveResponse"),
        forward("delete_test_cases", "TestCaseDeleteParams", "TestCaseDeleteResponse"),
        forward(
          "list_test_case_modules",
          "TestCaseModuleListParams",
          "TestCaseModuleListResponse",
        ),
        forward(
          "save_test_case_module",
          "TestCaseModuleSaveParams",
          "TestCaseModuleSaveResponse",
        ),
        forward(
          "delete_test_case_module",
          "TestCaseModuleDeleteParams",
          "TestCaseModuleDeleteResponse",
        ),
        forward("save_test_case_run", "TestCaseRunSaveParams", "TestCaseRunSaveResponse"),
        forward("list_test_case_runs", "TestCaseRunListParams", "TestCaseRunListResponse"),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/perf_monitor.rs",
    runtimeForwarding(
      [
        forward(
          "save_perf_monitor_session",
          "PerfMonitorSessionSaveParams",
          "PerfMonitorSessionSaveResponse",
        ),
        forward(
          "list_perf_monitor_sessions",
          "PerfMonitorSessionListParams",
          "PerfMonitorSessionListResponse",
        ),
        forward(
          "read_perf_monitor_session",
          "PerfMonitorSessionReadParams",
          "PerfMonitorSessionReadResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/perf_trace.rs",
    runtimeForwarding(
      [
        forward(
          "save_perf_monitor_trace",
          "PerfMonitorTraceSaveParams",
          "PerfMonitorTraceSaveResponse",
        ),
        forward(
          "list_perf_monitor_traces",
          "PerfMonitorTraceListParams",
          "PerfMonitorTraceListResponse",
        ),
        forward(
          "read_perf_monitor_trace",
          "PerfMonitorTraceReadParams",
          "PerfMonitorTraceReadResponse",
        ),
        forward(
          "delete_perf_monitor_trace",
          "PerfMonitorTraceDeleteParams",
          "PerfMonitorTraceDeleteResponse",
        ),
        forward(
          "save_perf_monitor_trace_analysis",
          "PerfMonitorTraceAnalysisSaveParams",
          "PerfMonitorTraceAnalysisSaveResponse",
        ),
        forward(
          "list_perf_monitor_trace_analyses",
          "PerfMonitorTraceAnalysisListParams",
          "PerfMonitorTraceAnalysisListResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/device_flow.rs",
    runtimeForwarding(
      [
        forward("list_device_flows", "DeviceFlowListParams", "DeviceFlowListResponse"),
        forward("read_device_flow", "DeviceFlowReadParams", "DeviceFlowReadResponse"),
        forward("save_device_flow", "DeviceFlowSaveParams", "DeviceFlowSaveResponse"),
        forward("delete_device_flows", "DeviceFlowDeleteParams", "DeviceFlowDeleteResponse"),
        forward("save_device_flow_run", "DeviceFlowRunSaveParams", "DeviceFlowRunSaveResponse"),
        forward("list_device_flow_runs", "DeviceFlowRunListParams", "DeviceFlowRunListResponse"),
        forward("read_device_flow_run", "DeviceFlowRunReadParams", "DeviceFlowRunReadResponse"),
        forward(
          "list_device_flow_healing",
          "DeviceFlowHealingListParams",
          "DeviceFlowHealingListResponse",
        ),
        forward(
          "save_device_flow_healing",
          "DeviceFlowHealingSaveParams",
          "DeviceFlowHealingSaveResponse",
        ),
        forward(
          "resolve_device_flow_healing",
          "DeviceFlowHealingResolveParams",
          "DeviceFlowHealingResolveResponse",
        ),
      ].join("\n\n"),
    ),
  );

  write(
    "ember-rs/crates/app-server/src/runtime/device_explore.rs",
    runtimeForwarding(
      [
        forward(
          "read_device_explore_profile",
          "DeviceExploreReadParams",
          "DeviceExploreReadResponse",
        ),
        forward(
          "save_device_explore_profile",
          "DeviceExploreSaveParams",
          "DeviceExploreSaveResponse",
        ),
        forward(
          "save_device_explore_run",
          "DeviceExploreRunSaveParams",
          "DeviceExploreRunSaveResponse",
        ),
        forward(
          "list_device_explore_runs",
          "DeviceExploreRunListParams",
          "DeviceExploreRunListResponse",
        ),
        forward(
          "read_device_explore_run",
          "DeviceExploreRunReadParams",
          "DeviceExploreRunReadResponse",
        ),
      ].join("\n\n"),
    ),
  );

  const implHeader = `use super::super::*;
use async_trait::async_trait;

#[async_trait]
`;

  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/test_cases.rs",
    `${implHeader}impl TestCasesAppDataSource for LocalAppDataSource {
    async fn list_test_cases(
        &self,
        params: TestCaseListParams,
    ) -> Result<TestCaseListResponse, RuntimeCoreError> {
${syncDelegate("test_cases::list_test_cases", "params")}
    }

    async fn read_test_case(
        &self,
        params: TestCaseReadParams,
    ) -> Result<TestCaseReadResponse, RuntimeCoreError> {
${syncDelegate("test_cases::read_test_case", "params")}
    }

    async fn save_test_case(
        &self,
        params: TestCaseSaveParams,
    ) -> Result<TestCaseSaveResponse, RuntimeCoreError> {
${syncDelegate("test_cases::save_test_case", "params")}
    }

    async fn delete_test_cases(
        &self,
        params: TestCaseDeleteParams,
    ) -> Result<TestCaseDeleteResponse, RuntimeCoreError> {
${syncDelegate("test_cases::delete_test_cases", "params")}
    }

    async fn list_test_case_modules(
        &self,
        params: TestCaseModuleListParams,
    ) -> Result<TestCaseModuleListResponse, RuntimeCoreError> {
${syncDelegate("test_cases::list_test_case_modules", "params")}
    }

    async fn save_test_case_module(
        &self,
        params: TestCaseModuleSaveParams,
    ) -> Result<TestCaseModuleSaveResponse, RuntimeCoreError> {
${syncDelegate("test_cases::save_test_case_module", "params")}
    }

    async fn delete_test_case_module(
        &self,
        params: TestCaseModuleDeleteParams,
    ) -> Result<TestCaseModuleDeleteResponse, RuntimeCoreError> {
${syncDelegate("test_cases::delete_test_case_module", "params")}
    }

    async fn save_test_case_run(
        &self,
        params: TestCaseRunSaveParams,
    ) -> Result<TestCaseRunSaveResponse, RuntimeCoreError> {
${syncDelegate("test_cases::save_test_case_run", "params")}
    }

    async fn list_test_case_runs(
        &self,
        params: TestCaseRunListParams,
    ) -> Result<TestCaseRunListResponse, RuntimeCoreError> {
${syncDelegate("test_cases::list_test_case_runs", "params")}
    }
}
`,
  );

  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/device_flow.rs",
    `${implHeader}impl DeviceFlowAppDataSource for LocalAppDataSource {
    async fn list_device_flows(
        &self,
        params: DeviceFlowListParams,
    ) -> Result<DeviceFlowListResponse, RuntimeCoreError> {
${syncDelegate("device_flow::list_device_flows", "params")}
    }

    async fn read_device_flow(
        &self,
        params: DeviceFlowReadParams,
    ) -> Result<DeviceFlowReadResponse, RuntimeCoreError> {
${syncDelegate("device_flow::read_device_flow", "params")}
    }

    async fn save_device_flow(
        &self,
        params: DeviceFlowSaveParams,
    ) -> Result<DeviceFlowSaveResponse, RuntimeCoreError> {
${syncDelegate("device_flow::save_device_flow", "params")}
    }

    async fn delete_device_flows(
        &self,
        params: DeviceFlowDeleteParams,
    ) -> Result<DeviceFlowDeleteResponse, RuntimeCoreError> {
${syncDelegate("device_flow::delete_device_flows", "params")}
    }

    async fn save_device_flow_run(
        &self,
        params: DeviceFlowRunSaveParams,
    ) -> Result<DeviceFlowRunSaveResponse, RuntimeCoreError> {
${syncDelegate("device_flow::save_device_flow_run", "params")}
    }

    async fn list_device_flow_runs(
        &self,
        params: DeviceFlowRunListParams,
    ) -> Result<DeviceFlowRunListResponse, RuntimeCoreError> {
${syncDelegate("device_flow::list_device_flow_runs", "params")}
    }

    async fn read_device_flow_run(
        &self,
        params: DeviceFlowRunReadParams,
    ) -> Result<DeviceFlowRunReadResponse, RuntimeCoreError> {
${syncDelegate("device_flow::read_device_flow_run", "params")}
    }

    async fn list_device_flow_healing(
        &self,
        params: DeviceFlowHealingListParams,
    ) -> Result<DeviceFlowHealingListResponse, RuntimeCoreError> {
${syncDelegate("device_flow::list_device_flow_healing", "params")}
    }

    async fn save_device_flow_healing(
        &self,
        params: DeviceFlowHealingSaveParams,
    ) -> Result<DeviceFlowHealingSaveResponse, RuntimeCoreError> {
${syncDelegate("device_flow::save_device_flow_healing", "params")}
    }

    async fn resolve_device_flow_healing(
        &self,
        params: DeviceFlowHealingResolveParams,
    ) -> Result<DeviceFlowHealingResolveResponse, RuntimeCoreError> {
${syncDelegate("device_flow::resolve_device_flow_healing", "params")}
    }
}
`,
  );

  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/perf_monitor.rs",
    `${implHeader}impl PerfMonitorAppDataSource for LocalAppDataSource {
    async fn save_perf_monitor_session(
        &self,
        params: PerfMonitorSessionSaveParams,
    ) -> Result<PerfMonitorSessionSaveResponse, RuntimeCoreError> {
${syncDelegate("perf_monitor::save_perf_monitor_session", "params")}
    }

    async fn list_perf_monitor_sessions(
        &self,
        params: PerfMonitorSessionListParams,
    ) -> Result<PerfMonitorSessionListResponse, RuntimeCoreError> {
${syncDelegate("perf_monitor::list_perf_monitor_sessions", "params")}
    }

    async fn read_perf_monitor_session(
        &self,
        params: PerfMonitorSessionReadParams,
    ) -> Result<PerfMonitorSessionReadResponse, RuntimeCoreError> {
${syncDelegate("perf_monitor::read_perf_monitor_session", "params")}
    }
}
`,
  );

  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/perf_trace.rs",
    `${implHeader}impl PerfTraceAppDataSource for LocalAppDataSource {
    async fn save_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceSaveParams,
    ) -> Result<PerfMonitorTraceSaveResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::save_perf_monitor_trace", "params")}
    }

    async fn list_perf_monitor_traces(
        &self,
        params: PerfMonitorTraceListParams,
    ) -> Result<PerfMonitorTraceListResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::list_perf_monitor_traces", "params")}
    }

    async fn read_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceReadParams,
    ) -> Result<PerfMonitorTraceReadResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::read_perf_monitor_trace", "params")}
    }

    async fn delete_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceDeleteParams,
    ) -> Result<PerfMonitorTraceDeleteResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::delete_perf_monitor_trace", "params")}
    }

    async fn save_perf_monitor_trace_analysis(
        &self,
        params: PerfMonitorTraceAnalysisSaveParams,
    ) -> Result<PerfMonitorTraceAnalysisSaveResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::save_perf_monitor_trace_analysis", "params")}
    }

    async fn list_perf_monitor_trace_analyses(
        &self,
        params: PerfMonitorTraceAnalysisListParams,
    ) -> Result<PerfMonitorTraceAnalysisListResponse, RuntimeCoreError> {
${syncDelegate("perf_trace::list_perf_monitor_trace_analyses", "params")}
    }
}
`,
  );

  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/device_explore.rs",
    `${implHeader}impl DeviceExploreAppDataSource for LocalAppDataSource {
    async fn read_device_explore_profile(
        &self,
        params: DeviceExploreReadParams,
    ) -> Result<DeviceExploreReadResponse, RuntimeCoreError> {
${syncDelegate("device_explore::read_device_explore_profile", "params")}
    }

    async fn save_device_explore_profile(
        &self,
        params: DeviceExploreSaveParams,
    ) -> Result<DeviceExploreSaveResponse, RuntimeCoreError> {
${syncDelegate("device_explore::save_device_explore_profile", "params")}
    }

    async fn save_device_explore_run(
        &self,
        params: DeviceExploreRunSaveParams,
    ) -> Result<DeviceExploreRunSaveResponse, RuntimeCoreError> {
${syncDelegate("device_explore::save_device_explore_run", "params")}
    }

    async fn list_device_explore_runs(
        &self,
        params: DeviceExploreRunListParams,
    ) -> Result<DeviceExploreRunListResponse, RuntimeCoreError> {
${syncDelegate("device_explore::list_device_explore_runs", "params")}
    }

    async fn read_device_explore_run(
        &self,
        params: DeviceExploreRunReadParams,
    ) -> Result<DeviceExploreRunReadResponse, RuntimeCoreError> {
${syncDelegate("device_explore::read_device_explore_run", "params")}
    }
}
`,
  );
}

function patchProtocolAndDispatch() {
  write(
    "ember-rs/crates/app-server-protocol/src/protocol/v0/method_names.rs",
    insertBefore(
      read("ember-rs/crates/app-server-protocol/src/protocol/v0/method_names.rs"),
      "pub const METHOD_WORKFLOW_READ",
      `${METHOD_NAMES_BLOCK}\n`,
    ),
  );

  let catalog = read("ember-rs/crates/app-server-protocol/src/protocol/v0/catalog.rs");
  catalog = insertBefore(catalog, "    #[serde(rename = \"workflow/read\")]", CATALOG_ENUM_BLOCK);
  catalog = insertBefore(
    catalog,
    "            Self::WorkflowRead => METHOD_WORKFLOW_READ,",
    CATALOG_AS_STR_BLOCK,
  );
  catalog = insertBefore(
    catalog,
    "            METHOD_WORKFLOW_READ => Some(Self::WorkflowRead),",
    CATALOG_PARSE_BLOCK,
  );
  write("ember-rs/crates/app-server-protocol/src/protocol/v0/catalog.rs", catalog);

  write(
    "ember-rs/crates/app-server-protocol/src/protocol/v0/client_request.rs",
    insertBefore(
      read("ember-rs/crates/app-server-protocol/src/protocol/v0/client_request.rs"),
      "    WorkflowRead => \"workflow/read\",",
      `${CLIENT_REQUEST_BLOCK}\n`,
    ),
  );

  let v0 = read("ember-rs/crates/app-server-protocol/src/protocol/v0.rs");
  v0 = insertBefore(v0, "mod workflow;", `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`);
  v0 = insertBefore(
    v0,
    "pub use workflow::*;",
    `pub use device_explore::*;\npub use device_flow::*;\npub use perf_monitor::*;\npub use perf_trace::*;\npub use test_cases::*;\n`,
  );
  write("ember-rs/crates/app-server-protocol/src/protocol/v0.rs", v0);

  write(
    "ember-rs/crates/app-server/src/processor/dispatch.rs",
    insertBefore(
      read("ember-rs/crates/app-server/src/processor/dispatch.rs"),
      "            METHOD_WORKFLOW_READ => self.handle_workflow_read_impl(params).await,",
      DISPATCH_BLOCK,
    ),
  );

  write(
    "ember-rs/crates/app-server/src/processor/mod.rs",
    insertBefore(
      read("ember-rs/crates/app-server/src/processor/mod.rs"),
      "mod diagnostics;",
      `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`,
    ),
  );

  write(
    "ember-rs/crates/app-server/src/local_data_source.rs",
    insertBefore(
      read("ember-rs/crates/app-server/src/local_data_source.rs"),
      "mod diagnostics;",
      `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`,
    ),
  );

  let appData = read("ember-rs/crates/app-server/src/runtime/app_data.rs");
  appData = insertBefore(appData, "mod diagnostics;", `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`);
  appData = insertBefore(
    appData,
    "pub use diagnostics::DiagnosticsAppDataSource;",
    `pub use device_explore::DeviceExploreAppDataSource;\npub use device_flow::DeviceFlowAppDataSource;\npub use perf_monitor::PerfMonitorAppDataSource;\npub use perf_trace::PerfTraceAppDataSource;\npub use test_cases::TestCasesAppDataSource;\n`,
  );
  appData = insertBefore(
    appData,
    "    + DiagnosticsAppDataSource",
    `    + TestCasesAppDataSource\n    + PerfMonitorAppDataSource\n    + PerfTraceAppDataSource\n    + DeviceFlowAppDataSource\n    + DeviceExploreAppDataSource`,
  );
  appData = insertBefore(
    appData,
    "        + DiagnosticsAppDataSource",
    `        + TestCasesAppDataSource\n        + PerfMonitorAppDataSource\n        + PerfTraceAppDataSource\n        + DeviceFlowAppDataSource\n        + DeviceExploreAppDataSource`,
  );
  write("ember-rs/crates/app-server/src/runtime/app_data.rs", appData);

  let runtime = read("ember-rs/crates/app-server/src/runtime.rs");
  runtime = insertBefore(runtime, "mod workspaces;", `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`);
  write("ember-rs/crates/app-server/src/runtime.rs", runtime);

  const implsMod = read("ember-rs/crates/app-server/src/local_data_source/impls/mod.rs");
  write(
    "ember-rs/crates/app-server/src/local_data_source/impls/mod.rs",
    insertBefore(implsMod, "mod diagnostics;", `mod device_explore;\nmod device_flow;\nmod perf_monitor;\nmod perf_trace;\nmod test_cases;\n`),
  );
}

function patchMainTs() {
  const mainPath = "electron/main.ts";
  let main = read(mainPath);
  if (!main.includes("bootstrapDeviceAutomationHost")) {
    main = insertAfter(
      main,
      `import { ElectronHostCommands } from "./hostCommands";`,
      `
import {
  bootstrapDeviceAutomationHost,
  ElectronDeviceAutomationHost,
  isDeviceAutomationCommand,
  type DeviceAutomationHostBootstrap,
} from "./deviceAutomationHost";`,
    );
    main = insertAfter(
      main,
      `const hostCommands = new ElectronHostCommands();`,
      `
const deviceAutomationHost = new ElectronDeviceAutomationHost();
let deviceAutomationBootstrap: DeviceAutomationHostBootstrap | null = null;`,
    );
    main = insertBefore(
      main,
      `  if (isElectronHostCommand(command)) {`,
      `  if (isDeviceAutomationCommand(command)) {
    return await deviceAutomationHost.invoke(command, args);
  }
`,
    );
    main = insertBefore(
      main,
      `  hostCommands.dispose?.();`,
      `  deviceAutomationBootstrap?.dispose();
  deviceAutomationBootstrap = null;
`,
    );
    // bootstrap on ready - find broadcast setup
    if (main.includes("const broadcast")) {
      main = insertAfter(
        main,
        `const broadcast = (channel: string, payload: unknown) => {`,
        `
    if (!deviceAutomationBootstrap) {
      deviceAutomationBootstrap = bootstrapDeviceAutomationHost(broadcast);
    }`,
      );
    }
  }
  write(mainPath, main);
}

writeTraitAndRuntime();
patchProtocolAndDispatch();
patchMainTs();
console.log("[rust-wiring] 测试平台 Rust/协议/Host 接线补丁已写入");
