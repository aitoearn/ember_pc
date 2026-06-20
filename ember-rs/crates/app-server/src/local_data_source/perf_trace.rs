//! P2 · Perfetto trace：protocol ↔ core DAO 映射。

use super::data_error;
use crate::RuntimeCoreError;
use app_server_protocol::{
    PerfMonitorTraceAnalysisListParams, PerfMonitorTraceAnalysisListResponse,
    PerfMonitorTraceAnalysisSaveParams, PerfMonitorTraceAnalysisSaveResponse,
    PerfMonitorTraceDeleteParams, PerfMonitorTraceDeleteResponse, PerfMonitorTraceListParams,
    PerfMonitorTraceListResponse, PerfMonitorTraceReadParams, PerfMonitorTraceReadResponse,
    PerfMonitorTraceSaveParams, PerfMonitorTraceSaveResponse, PerformanceTraceAnalysis,
    PerformanceTraceArtifact,
};
use chrono::DateTime;
use ember_core::database;
use ember_core::database::dao::perf_trace_dao::{
    PerfTraceDao, PerformanceTraceAnalysisRecord, PerformanceTraceArtifactRecord,
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

fn opt_millis_from_rfc3339(value: Option<String>) -> Option<i64> {
    value
        .map(|raw| {
            let millis = rfc3339_to_millis(&raw);
            if millis == 0 {
                None
            } else {
                Some(millis)
            }
        })
        .flatten()
}

fn artifact_record_to_protocol(
    record: PerformanceTraceArtifactRecord,
) -> PerformanceTraceArtifact {
    PerformanceTraceArtifact {
        id: record.id,
        workspace_id: record.workspace_id,
        linked_session_id: record.linked_session_id,
        device_id: record.device_id,
        device_platform: record.device_platform,
        package_name: record.package_name,
        preset_id: record.preset_id,
        config_json: record.config_json,
        local_path: record.local_path,
        remote_path: record.remote_path,
        size_bytes: record.size_bytes,
        duration_ms: record.duration_ms,
        status: record.status,
        error_message: record.error_message,
        created_at: millis_to_rfc3339(record.created_at),
        stopped_at: record.stopped_at.map(millis_to_rfc3339),
    }
}

fn artifact_protocol_to_record(
    artifact: PerformanceTraceArtifact,
) -> PerformanceTraceArtifactRecord {
    PerformanceTraceArtifactRecord {
        id: artifact.id,
        workspace_id: artifact.workspace_id,
        linked_session_id: artifact.linked_session_id,
        device_id: artifact.device_id,
        device_platform: artifact.device_platform,
        package_name: artifact.package_name,
        preset_id: artifact.preset_id,
        config_json: artifact.config_json,
        local_path: artifact.local_path,
        remote_path: artifact.remote_path,
        size_bytes: artifact.size_bytes,
        duration_ms: artifact.duration_ms,
        status: artifact.status,
        error_message: artifact.error_message,
        created_at: rfc3339_to_millis(&artifact.created_at),
        stopped_at: opt_millis_from_rfc3339(artifact.stopped_at),
    }
}

fn analysis_record_to_protocol(
    record: PerformanceTraceAnalysisRecord,
) -> PerformanceTraceAnalysis {
    PerformanceTraceAnalysis {
        id: record.id,
        artifact_id: record.artifact_id,
        analysis_type: record.analysis_type,
        package_name: record.package_name,
        time_range_json: record.time_range_json,
        result_json: record.result_json.unwrap_or_default(),
        status: record.status,
        created_at: millis_to_rfc3339(record.created_at),
    }
}

fn analysis_protocol_to_record(
    analysis: PerformanceTraceAnalysis,
) -> PerformanceTraceAnalysisRecord {
    PerformanceTraceAnalysisRecord {
        id: analysis.id,
        artifact_id: analysis.artifact_id,
        analysis_type: analysis.analysis_type,
        package_name: analysis.package_name,
        time_range_json: analysis.time_range_json,
        result_json: Some(analysis.result_json),
        status: analysis.status,
        created_at: rfc3339_to_millis(&analysis.created_at),
    }
}

pub(crate) fn save_perf_monitor_trace(
    db: &DbConnection,
    params: PerfMonitorTraceSaveParams,
) -> Result<PerfMonitorTraceSaveResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let record = artifact_protocol_to_record(params.artifact);
    let id = record.id.clone();
    PerfTraceDao::save_artifact(&conn, record).map_err(data_error)?;
    Ok(PerfMonitorTraceSaveResponse { id })
}

pub(crate) fn list_perf_monitor_traces(
    db: &DbConnection,
    params: PerfMonitorTraceListParams,
) -> Result<PerfMonitorTraceListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let limit = params.limit.unwrap_or(50).max(1);
    let offset = params.offset.unwrap_or(0);
    let records = PerfTraceDao::list_artifacts(&conn, &params.workspace_id, limit, offset)
        .map_err(data_error)?;
    let artifacts = records.into_iter().map(artifact_record_to_protocol).collect();
    Ok(PerfMonitorTraceListResponse { artifacts })
}

pub(crate) fn read_perf_monitor_trace(
    db: &DbConnection,
    params: PerfMonitorTraceReadParams,
) -> Result<PerfMonitorTraceReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let artifact = PerfTraceDao::read_artifact(&conn, &params.id)
        .map_err(data_error)?
        .map(artifact_record_to_protocol);
    Ok(PerfMonitorTraceReadResponse { artifact })
}

pub(crate) fn delete_perf_monitor_trace(
    db: &DbConnection,
    params: PerfMonitorTraceDeleteParams,
) -> Result<PerfMonitorTraceDeleteResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let deleted = PerfTraceDao::delete_artifact(&conn, &params.id).map_err(data_error)?;
    Ok(PerfMonitorTraceDeleteResponse { deleted })
}

pub(crate) fn save_perf_monitor_trace_analysis(
    db: &DbConnection,
    params: PerfMonitorTraceAnalysisSaveParams,
) -> Result<PerfMonitorTraceAnalysisSaveResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let record = analysis_protocol_to_record(params.analysis);
    let id = record.id.clone();
    PerfTraceDao::save_analysis(&conn, record).map_err(data_error)?;
    Ok(PerfMonitorTraceAnalysisSaveResponse { id })
}

pub(crate) fn list_perf_monitor_trace_analyses(
    db: &DbConnection,
    params: PerfMonitorTraceAnalysisListParams,
) -> Result<PerfMonitorTraceAnalysisListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let limit = params.limit.unwrap_or(20).max(1);
    let records = PerfTraceDao::list_analyses(&conn, &params.artifact_id, limit)
        .map_err(data_error)?;
    let analyses = records.into_iter().map(analysis_record_to_protocol).collect();
    Ok(PerfMonitorTraceAnalysisListResponse { analyses })
}
