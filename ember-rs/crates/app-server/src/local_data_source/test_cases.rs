//! 测试用例管理：protocol ↔ core DAO 映射。
//!
//! 在协议边界完成 JSON 列（steps/assertions/tags）与毫秒时间戳 ↔ RFC3339 的互转。

use super::data_error;
use crate::RuntimeCoreError;
use app_server_protocol::{
    TestCase, TestCaseDeleteParams, TestCaseDeleteResponse, TestCaseListParams,
    TestCaseListResponse, TestCaseModule, TestCaseModuleDeleteParams, TestCaseModuleDeleteResponse,
    TestCaseModuleListParams, TestCaseModuleListResponse, TestCaseModuleSaveParams,
    TestCaseModuleSaveResponse, TestCaseReadParams, TestCaseReadResponse, TestCaseRun,
    TestCaseRunListParams, TestCaseRunListResponse, TestCaseRunSaveParams, TestCaseRunSaveResponse,
    TestCaseRunStep, TestCaseSaveParams, TestCaseSaveResponse, TestCaseStep,
};
use chrono::DateTime;
use ember_core::database;
use ember_core::database::dao::test_case_dao::{
    TestCaseDao, TestCaseModuleRecord, TestCaseRecord, TestCaseRunRecord, TestCaseRunStepRecord,
};
use ember_core::database::DbConnection;

fn millis_to_rfc3339(millis: i64) -> String {
    DateTime::from_timestamp_millis(millis)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default()
}

fn rfc3339_to_millis(value: &str) -> i64 {
    DateTime::parse_from_rfc3339(value.trim())
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0)
}

fn opt_from_str(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn module_record_to_protocol(record: TestCaseModuleRecord) -> TestCaseModule {
    TestCaseModule {
        id: record.id,
        name: record.name,
        parent_id: record.parent_id,
        order_index: record.order_index,
    }
}

fn case_record_to_protocol(record: TestCaseRecord) -> TestCase {
    let steps: Vec<TestCaseStep> =
        serde_json::from_str(&record.steps_json).unwrap_or_default();
    let assertions: Vec<String> =
        serde_json::from_str(&record.assertions_json).unwrap_or_default();
    let tags: Vec<String> = serde_json::from_str(&record.tags_json).unwrap_or_default();
    TestCase {
        id: record.id,
        case_id: record.case_id,
        title: record.title,
        module_id: record.module_id.unwrap_or_default(),
        priority: record.priority,
        case_type: record.case_type,
        status: record.status,
        source: record.source,
        precondition: record.precondition,
        steps,
        assertions,
        tags,
        exec_result: record.exec_result,
        remark: record.remark,
        created_at: millis_to_rfc3339(record.created_at),
        updated_at: millis_to_rfc3339(record.updated_at),
    }
}

fn protocol_case_to_record(case: TestCase) -> Result<TestCaseRecord, RuntimeCoreError> {
    let steps_json = serde_json::to_string(&case.steps).map_err(data_error)?;
    let assertions_json = serde_json::to_string(&case.assertions).map_err(data_error)?;
    let tags_json = serde_json::to_string(&case.tags).map_err(data_error)?;
    Ok(TestCaseRecord {
        id: case.id,
        case_id: case.case_id,
        title: case.title,
        module_id: opt_from_str(&case.module_id),
        priority: case.priority,
        case_type: case.case_type,
        status: case.status,
        source: case.source,
        precondition: case.precondition,
        steps_json,
        assertions_json,
        tags_json,
        exec_result: case.exec_result,
        remark: case.remark,
        created_at: 0,
        updated_at: 0,
    })
}

pub(crate) fn list_test_cases(
    db: &DbConnection,
    params: TestCaseListParams,
) -> Result<TestCaseListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records = TestCaseDao::list_cases(&conn, &params.workspace_id, params.module_id.as_deref())
        .map_err(data_error)?;
    Ok(TestCaseListResponse {
        cases: records.into_iter().map(case_record_to_protocol).collect(),
    })
}

pub(crate) fn read_test_case(
    db: &DbConnection,
    params: TestCaseReadParams,
) -> Result<TestCaseReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let case = TestCaseDao::read_case(&conn, &params.id)
        .map_err(data_error)?
        .map(case_record_to_protocol);
    Ok(TestCaseReadResponse { case })
}

pub(crate) fn save_test_case(
    db: &DbConnection,
    params: TestCaseSaveParams,
) -> Result<TestCaseSaveResponse, RuntimeCoreError> {
    let record = protocol_case_to_record(params.case)?;
    let conn = database::lock_db(db).map_err(data_error)?;
    let saved =
        TestCaseDao::save_case(&conn, &params.workspace_id, record).map_err(data_error)?;
    Ok(TestCaseSaveResponse {
        case: case_record_to_protocol(saved),
    })
}

pub(crate) fn delete_test_cases(
    db: &DbConnection,
    params: TestCaseDeleteParams,
) -> Result<TestCaseDeleteResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let deleted = TestCaseDao::delete_cases(&conn, &params.ids).map_err(data_error)?;
    Ok(TestCaseDeleteResponse { deleted })
}

pub(crate) fn list_test_case_modules(
    db: &DbConnection,
    params: TestCaseModuleListParams,
) -> Result<TestCaseModuleListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records =
        TestCaseDao::list_modules(&conn, &params.workspace_id).map_err(data_error)?;
    Ok(TestCaseModuleListResponse {
        modules: records.into_iter().map(module_record_to_protocol).collect(),
    })
}

pub(crate) fn save_test_case_module(
    db: &DbConnection,
    params: TestCaseModuleSaveParams,
) -> Result<TestCaseModuleSaveResponse, RuntimeCoreError> {
    let record = TestCaseModuleRecord {
        id: params.module.id,
        name: params.module.name,
        parent_id: params.module.parent_id,
        order_index: params.module.order_index,
        created_at: 0,
        updated_at: 0,
    };
    let conn = database::lock_db(db).map_err(data_error)?;
    let saved =
        TestCaseDao::save_module(&conn, &params.workspace_id, record).map_err(data_error)?;
    Ok(TestCaseModuleSaveResponse {
        module: module_record_to_protocol(saved),
    })
}

pub(crate) fn delete_test_case_module(
    db: &DbConnection,
    params: TestCaseModuleDeleteParams,
) -> Result<TestCaseModuleDeleteResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let deleted = TestCaseDao::delete_module(&conn, &params.workspace_id, &params.id)
        .map_err(data_error)?;
    Ok(TestCaseModuleDeleteResponse { deleted })
}

// ----------------------------------------------------------------------------
// 执行记录（US3）
// ----------------------------------------------------------------------------

fn run_step_record_to_protocol(record: TestCaseRunStepRecord) -> TestCaseRunStep {
    TestCaseRunStep {
        id: record.id,
        run_id: record.run_id,
        step_no: record.step_no.max(0) as u32,
        observation: record.observation,
        screenshot_path: record.screenshot_path,
        ts: millis_to_rfc3339(record.ts),
    }
}

fn run_record_to_protocol(record: TestCaseRunRecord) -> TestCaseRun {
    TestCaseRun {
        id: record.id,
        case_id: record.case_id,
        device_id: record.device_id,
        instruction: record.instruction,
        result: record.result,
        summary: record.summary,
        started_at: millis_to_rfc3339(record.started_at),
        finished_at: record.finished_at.map(millis_to_rfc3339).unwrap_or_default(),
        steps: record
            .steps
            .into_iter()
            .map(run_step_record_to_protocol)
            .collect(),
    }
}

pub(crate) fn save_test_case_run(
    db: &DbConnection,
    params: TestCaseRunSaveParams,
) -> Result<TestCaseRunSaveResponse, RuntimeCoreError> {
    let run = params.run;
    let result = if run.result.trim().is_empty() {
        "阻塞".to_string()
    } else {
        run.result.clone()
    };
    let finished = run.finished_at.trim().to_string();

    let conn = database::lock_db(db).map_err(data_error)?;
    let run_record = TestCaseRunRecord {
        id: run.id.clone(),
        case_id: run.case_id.clone(),
        device_id: run.device_id.clone(),
        instruction: run.instruction.clone(),
        result: result.clone(),
        summary: run.summary.clone(),
        started_at: rfc3339_to_millis(&run.started_at),
        finished_at: None,
        created_at: 0,
        steps: Vec::new(),
    };
    let saved = TestCaseDao::start_run(&conn, &params.workspace_id, run_record)
        .map_err(data_error)?;

    for (index, step) in run.steps.iter().enumerate() {
        let step_no = if step.step_no == 0 {
            (index + 1) as i64
        } else {
            step.step_no as i64
        };
        TestCaseDao::append_run_step(
            &conn,
            TestCaseRunStepRecord {
                id: step.id.clone(),
                run_id: saved.id.clone(),
                step_no,
                observation: step.observation.clone(),
                screenshot_path: step.screenshot_path.clone(),
                ts: rfc3339_to_millis(&step.ts),
            },
        )
        .map_err(data_error)?;
    }

    if !finished.is_empty() {
        TestCaseDao::complete_run(
            &conn,
            &saved.id,
            &result,
            &run.summary,
            rfc3339_to_millis(&finished),
        )
        .map_err(data_error)?;
    }

    let read = TestCaseDao::read_run(&conn, &saved.id)
        .map_err(data_error)?
        .unwrap_or(saved);
    Ok(TestCaseRunSaveResponse {
        run: run_record_to_protocol(read),
    })
}

pub(crate) fn list_test_case_runs(
    db: &DbConnection,
    params: TestCaseRunListParams,
) -> Result<TestCaseRunListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records = TestCaseDao::list_runs(&conn, &params.workspace_id, &params.case_id)
        .map_err(data_error)?;
    Ok(TestCaseRunListResponse {
        runs: records.into_iter().map(run_record_to_protocol).collect(),
    })
}
