//! 工作区探索压测配置：protocol ↔ DAO。

use super::data_error;
use crate::RuntimeCoreError;
use app_server_protocol::{
    DeviceExploreProfile, DeviceExploreReadParams, DeviceExploreReadResponse,
    DeviceExploreRunListParams, DeviceExploreRunListResponse, DeviceExploreRunReadParams,
    DeviceExploreRunReadResponse, DeviceExploreRunSaveParams, DeviceExploreRunSaveResponse,
    DeviceExploreSaveParams, DeviceExploreSaveResponse, ExploreRun,
};
use ember_core::database;
use ember_core::database::dao::device_explore_dao::{DeviceExploreDao, DeviceExploreProfileRecord};
use ember_core::database::dao::device_explore_run_dao::{
    DeviceExploreRunDao, DeviceExploreRunRecord,
};
use ember_core::database::DbConnection;

fn record_to_protocol(record: DeviceExploreProfileRecord) -> DeviceExploreProfile {
    let rules: Vec<serde_json::Value> =
        serde_json::from_str(&record.rules_json).unwrap_or_default();
    let config: serde_json::Value =
        serde_json::from_str(&record.config_json).unwrap_or(serde_json::Value::Object(Default::default()));
    DeviceExploreProfile {
        workspace_id: record.workspace_id,
        rules,
        config,
        updated_at: record.updated_at,
    }
}

pub(crate) fn read_device_explore_profile(
    db: &DbConnection,
    params: DeviceExploreReadParams,
) -> Result<DeviceExploreReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let profile = DeviceExploreDao::read(&conn, &params.workspace_id)
        .map_err(data_error)?
        .map(record_to_protocol);
    Ok(DeviceExploreReadResponse { profile })
}

pub(crate) fn save_device_explore_profile(
    db: &DbConnection,
    params: DeviceExploreSaveParams,
) -> Result<DeviceExploreSaveResponse, RuntimeCoreError> {
    let profile = params.profile;
    if profile.workspace_id.trim().is_empty() {
        return Err(RuntimeCoreError::Backend(
            "workspaceId 不能为空".to_string(),
        ));
    }
    let rules_json = serde_json::to_string(&profile.rules).map_err(data_error)?;
    let config_json = serde_json::to_string(&profile.config).map_err(data_error)?;
    let conn = database::lock_db(db).map_err(data_error)?;
    let saved = DeviceExploreDao::save(
        &conn,
        &profile.workspace_id,
        &rules_json,
        &config_json,
    )
    .map_err(data_error)?;
    Ok(DeviceExploreSaveResponse {
        profile: record_to_protocol(saved),
    })
}

fn run_record_to_protocol(record: DeviceExploreRunRecord) -> ExploreRun {
    let steps_summary = record
        .steps_summary_json
        .as_deref()
        .and_then(|json| serde_json::from_str(json).ok());
    ExploreRun {
        id: record.id,
        workspace_id: record.workspace_id,
        session_id: record.session_id,
        device_id: record.device_id,
        package_name: record.package_name,
        engine_mode: record.engine_mode,
        started_at: record.started_at,
        finished_at: record.finished_at,
        conclusion: record.conclusion,
        event_count: record.event_count,
        throttle_ms: record.throttle_ms,
        running_minutes: record.running_minutes,
        seed: record.seed,
        events_injected: record.events_injected,
        crash_count: record.crash_count,
        anr_count: record.anr_count,
        explore_rules_count: record.explore_rules_count,
        rule_failures_count: record.rule_failures_count,
        local_result_dir: record.local_result_dir,
        bug_report_path: record.bug_report_path,
        steps_log_path: record.steps_log_path,
        steps_summary,
        summary: record.summary,
    }
}

fn protocol_run_to_record(run: ExploreRun) -> Result<DeviceExploreRunRecord, RuntimeCoreError> {
    if run.workspace_id.trim().is_empty() {
        return Err(RuntimeCoreError::Backend(
            "workspaceId 不能为空".to_string(),
        ));
    }
    let steps_summary_json = match run.steps_summary {
        Some(value) => Some(serde_json::to_string(&value).map_err(data_error)?),
        None => None,
    };
    Ok(DeviceExploreRunRecord {
        id: run.id,
        workspace_id: run.workspace_id,
        session_id: run.session_id,
        device_id: run.device_id,
        package_name: run.package_name,
        engine_mode: if run.engine_mode.trim().is_empty() {
            "fastbot".to_string()
        } else {
            run.engine_mode
        },
        started_at: run.started_at,
        finished_at: run.finished_at,
        conclusion: if run.conclusion.trim().is_empty() {
            "completed".to_string()
        } else {
            run.conclusion
        },
        event_count: run.event_count,
        throttle_ms: run.throttle_ms,
        running_minutes: run.running_minutes,
        seed: run.seed,
        events_injected: run.events_injected,
        crash_count: run.crash_count,
        anr_count: run.anr_count,
        explore_rules_count: run.explore_rules_count,
        rule_failures_count: run.rule_failures_count,
        local_result_dir: run.local_result_dir,
        bug_report_path: run.bug_report_path,
        steps_log_path: run.steps_log_path,
        steps_summary_json,
        summary: run.summary,
    })
}

pub(crate) fn save_device_explore_run(
    db: &DbConnection,
    params: DeviceExploreRunSaveParams,
) -> Result<DeviceExploreRunSaveResponse, RuntimeCoreError> {
    let record = protocol_run_to_record(params.run)?;
    let conn = database::lock_db(db).map_err(data_error)?;
    let run_id = DeviceExploreRunDao::save(&conn, record).map_err(data_error)?;
    Ok(DeviceExploreRunSaveResponse { run_id })
}

pub(crate) fn list_device_explore_runs(
    db: &DbConnection,
    params: DeviceExploreRunListParams,
) -> Result<DeviceExploreRunListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records = DeviceExploreRunDao::list(
        &conn,
        &params.workspace_id,
        params.limit,
        params.offset,
    )
    .map_err(data_error)?;
    Ok(DeviceExploreRunListResponse {
        runs: records.into_iter().map(run_record_to_protocol).collect(),
    })
}

pub(crate) fn read_device_explore_run(
    db: &DbConnection,
    params: DeviceExploreRunReadParams,
) -> Result<DeviceExploreRunReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let run = DeviceExploreRunDao::read(&conn, &params.run_id)
        .map_err(data_error)?
        .map(run_record_to_protocol);
    Ok(DeviceExploreRunReadResponse { run })
}
