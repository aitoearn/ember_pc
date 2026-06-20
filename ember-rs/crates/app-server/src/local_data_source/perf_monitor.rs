//! 性能监控会话：protocol ↔ core DAO 映射。

use super::data_error;
use crate::RuntimeCoreError;
use app_server_protocol::{
    PerfMetricSummary, PerfMonitorSessionListParams, PerfMonitorSessionListResponse,
    PerfMonitorSessionReadParams, PerfMonitorSessionReadResponse, PerfMonitorSessionSaveParams,
    PerfMonitorSessionSaveResponse, PerformanceSession,
};
use chrono::DateTime;
use ember_core::database;
use ember_core::database::dao::perf_monitor_dao::{PerfMonitorDao, PerformanceSessionRecord};
use ember_core::database::DbConnection;
use std::collections::HashMap;

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

fn opt_millis_from_rfc3339(value: Option<String>) -> Option<i64> {
    value.map(|raw| {
        let millis = rfc3339_to_millis(&raw);
        if millis == 0 { None } else { Some(millis) }
    }).flatten()
}

fn record_to_protocol(record: PerformanceSessionRecord) -> Result<PerformanceSession, RuntimeCoreError> {
    let metrics: Vec<String> = serde_json::from_str(&record.metrics_json).unwrap_or_default();
    let summary: Option<HashMap<String, PerfMetricSummary>> = record
        .summary_json
        .as_deref()
        .map(|raw| serde_json::from_str(raw))
        .transpose()
        .map_err(data_error)?;
    Ok(PerformanceSession {
        id: record.id,
        workspace_id: record.workspace_id,
        device_id: record.device_id,
        device_platform: record.device_platform,
        package_name: record.package_name,
        metrics,
        interval_ms: record.interval_ms,
        status: record.status,
        started_at: millis_to_rfc3339(record.started_at),
        stopped_at: record.stopped_at.map(millis_to_rfc3339),
        summary,
    })
}

fn protocol_to_record(session: PerformanceSession) -> Result<PerformanceSessionRecord, RuntimeCoreError> {
    let metrics_json = serde_json::to_string(&session.metrics).map_err(data_error)?;
    let summary_json = session
        .summary
        .map(|summary| serde_json::to_string(&summary))
        .transpose()
        .map_err(data_error)?;
    Ok(PerformanceSessionRecord {
        id: session.id,
        workspace_id: session.workspace_id,
        device_id: session.device_id,
        device_platform: session.device_platform,
        package_name: session.package_name,
        metrics_json,
        interval_ms: session.interval_ms,
        status: session.status,
        started_at: rfc3339_to_millis(&session.started_at),
        stopped_at: opt_millis_from_rfc3339(session.stopped_at),
        summary_json,
    })
}

pub(crate) fn save_perf_monitor_session(
    db: &DbConnection,
    params: PerfMonitorSessionSaveParams,
) -> Result<PerfMonitorSessionSaveResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let record = protocol_to_record(params.session)?;
    let saved = PerfMonitorDao::save_session(&conn, record).map_err(data_error)?;
    Ok(PerfMonitorSessionSaveResponse {
        session: record_to_protocol(saved)?,
    })
}

pub(crate) fn list_perf_monitor_sessions(
    db: &DbConnection,
    params: PerfMonitorSessionListParams,
) -> Result<PerfMonitorSessionListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let limit = params.limit.unwrap_or(50).max(1);
    let offset = params.offset.unwrap_or(0);
    let records = PerfMonitorDao::list_sessions(&conn, &params.workspace_id, limit, offset)
        .map_err(data_error)?;
    let mut sessions = Vec::with_capacity(records.len());
    for record in records {
        sessions.push(record_to_protocol(record)?);
    }
    Ok(PerfMonitorSessionListResponse { sessions })
}

pub(crate) fn read_perf_monitor_session(
    db: &DbConnection,
    params: PerfMonitorSessionReadParams,
) -> Result<PerfMonitorSessionReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let session = PerfMonitorDao::read_session(&conn, &params.id)
        .map_err(data_error)?
        .map(record_to_protocol)
        .transpose()?;
    Ok(PerfMonitorSessionReadResponse { session })
}
