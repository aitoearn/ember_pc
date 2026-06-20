//! P2 · Perfetto trace artifact 与分析结果数据访问层。

use rusqlite::{params, Connection, OptionalExtension, Row};

/// Trace artifact 数据库记录。
#[derive(Debug, Clone, PartialEq)]
pub struct PerformanceTraceArtifactRecord {
    pub id: String,
    pub workspace_id: String,
    pub linked_session_id: Option<String>,
    pub device_id: String,
    pub device_platform: String,
    pub package_name: String,
    pub preset_id: String,
    pub config_json: Option<String>,
    pub local_path: Option<String>,
    pub remote_path: Option<String>,
    pub size_bytes: Option<i64>,
    pub duration_ms: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub stopped_at: Option<i64>,
}

/// Trace 分析结果数据库记录。
#[derive(Debug, Clone, PartialEq)]
pub struct PerformanceTraceAnalysisRecord {
    pub id: String,
    pub artifact_id: String,
    pub analysis_type: String,
    pub package_name: String,
    pub time_range_json: Option<String>,
    pub result_json: Option<String>,
    pub status: String,
    pub created_at: i64,
}

pub struct PerfTraceDao;

const VALID_ARTIFACT_STATUSES: &[&str] = &["recording", "ready", "failed"];
const VALID_ANALYSIS_STATUSES: &[&str] = &["pending", "done", "failed"];

fn db_err(error: impl std::fmt::Display) -> String {
    format!("Perfetto trace 数据库操作失败: {error}")
}

fn row_to_artifact(row: &Row<'_>) -> rusqlite::Result<PerformanceTraceArtifactRecord> {
    Ok(PerformanceTraceArtifactRecord {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        linked_session_id: row.get(2)?,
        device_id: row.get(3)?,
        device_platform: row.get(4)?,
        package_name: row.get(5)?,
        preset_id: row.get(6)?,
        config_json: row.get(7)?,
        local_path: row.get(8)?,
        remote_path: row.get(9)?,
        size_bytes: row.get(10)?,
        duration_ms: row.get(11)?,
        status: row.get(12)?,
        error_message: row.get(13)?,
        created_at: row.get(14)?,
        stopped_at: row.get(15)?,
    })
}

fn row_to_analysis(row: &Row<'_>) -> rusqlite::Result<PerformanceTraceAnalysisRecord> {
    Ok(PerformanceTraceAnalysisRecord {
        id: row.get(0)?,
        artifact_id: row.get(1)?,
        analysis_type: row.get(2)?,
        package_name: row.get(3)?,
        time_range_json: row.get(4)?,
        result_json: row.get(5)?,
        status: row.get(6)?,
        created_at: row.get(7)?,
    })
}

impl PerfTraceDao {
    pub fn save_artifact(
        conn: &Connection,
        record: PerformanceTraceArtifactRecord,
    ) -> Result<PerformanceTraceArtifactRecord, String> {
        let id = record.id.trim();
        let workspace_id = record.workspace_id.trim();
        let device_id = record.device_id.trim();
        let package_name = record.package_name.trim();
        if id.is_empty() {
            return Err("artifact id 不能为空".to_string());
        }
        if workspace_id.is_empty() {
            return Err("workspaceId 不能为空".to_string());
        }
        if device_id.is_empty() {
            return Err("deviceId 不能为空".to_string());
        }
        if package_name.is_empty() {
            return Err("packageName 不能为空".to_string());
        }
        if !VALID_ARTIFACT_STATUSES.contains(&record.status.as_str()) {
            return Err(format!("非法 trace 状态: {}", record.status));
        }

        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM performance_trace_artifacts WHERE id = ?1",
                params![id],
                |_| Ok(true),
            )
            .optional()
            .map_err(db_err)?
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE performance_trace_artifacts SET
                    workspace_id = ?1,
                    linked_session_id = ?2,
                    device_id = ?3,
                    device_platform = ?4,
                    package_name = ?5,
                    preset_id = ?6,
                    config_json = ?7,
                    local_path = ?8,
                    remote_path = ?9,
                    size_bytes = ?10,
                    duration_ms = ?11,
                    status = ?12,
                    error_message = ?13,
                    created_at = ?14,
                    stopped_at = ?15
                 WHERE id = ?16",
                params![
                    workspace_id,
                    record.linked_session_id,
                    device_id,
                    record.device_platform,
                    package_name,
                    record.preset_id,
                    record.config_json,
                    record.local_path,
                    record.remote_path,
                    record.size_bytes,
                    record.duration_ms,
                    record.status,
                    record.error_message,
                    record.created_at,
                    record.stopped_at,
                    id,
                ],
            )
            .map_err(db_err)?;
        } else {
            conn.execute(
                "INSERT INTO performance_trace_artifacts (
                    id, workspace_id, linked_session_id, device_id, device_platform,
                    package_name, preset_id, config_json, local_path, remote_path,
                    size_bytes, duration_ms, status, error_message, created_at, stopped_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                params![
                    id,
                    workspace_id,
                    record.linked_session_id,
                    device_id,
                    record.device_platform,
                    package_name,
                    record.preset_id,
                    record.config_json,
                    record.local_path,
                    record.remote_path,
                    record.size_bytes,
                    record.duration_ms,
                    record.status,
                    record.error_message,
                    record.created_at,
                    record.stopped_at,
                ],
            )
            .map_err(db_err)?;
        }

        Self::read_artifact(conn, id)?
            .ok_or_else(|| format!("保存后 artifact 不存在: {id}"))
    }

    pub fn list_artifacts(
        conn: &Connection,
        workspace_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PerformanceTraceArtifactRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, linked_session_id, device_id, device_platform,
                        package_name, preset_id, config_json, local_path, remote_path,
                        size_bytes, duration_ms, status, error_message, created_at, stopped_at
                 FROM performance_trace_artifacts
                 WHERE workspace_id = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![workspace_id, limit, offset], row_to_artifact)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    pub fn read_artifact(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<PerformanceTraceArtifactRecord>, String> {
        conn.query_row(
            "SELECT id, workspace_id, linked_session_id, device_id, device_platform,
                    package_name, preset_id, config_json, local_path, remote_path,
                    size_bytes, duration_ms, status, error_message, created_at, stopped_at
             FROM performance_trace_artifacts
             WHERE id = ?1",
            params![id],
            row_to_artifact,
        )
        .optional()
        .map_err(db_err)
    }

    pub fn delete_artifact(conn: &Connection, id: &str) -> Result<bool, String> {
        let affected = conn
            .execute(
                "DELETE FROM performance_trace_artifacts WHERE id = ?1",
                params![id],
            )
            .map_err(db_err)?;
        Ok(affected > 0)
    }

    pub fn save_analysis(
        conn: &Connection,
        record: PerformanceTraceAnalysisRecord,
    ) -> Result<PerformanceTraceAnalysisRecord, String> {
        let id = record.id.trim();
        let artifact_id = record.artifact_id.trim();
        let package_name = record.package_name.trim();
        if id.is_empty() {
            return Err("analysis id 不能为空".to_string());
        }
        if artifact_id.is_empty() {
            return Err("artifactId 不能为空".to_string());
        }
        if package_name.is_empty() {
            return Err("packageName 不能为空".to_string());
        }
        if !VALID_ANALYSIS_STATUSES.contains(&record.status.as_str()) {
            return Err(format!("非法分析状态: {}", record.status));
        }

        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM performance_trace_analyses WHERE id = ?1",
                params![id],
                |_| Ok(true),
            )
            .optional()
            .map_err(db_err)?
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE performance_trace_analyses SET
                    artifact_id = ?1,
                    analysis_type = ?2,
                    package_name = ?3,
                    time_range_json = ?4,
                    result_json = ?5,
                    status = ?6,
                    created_at = ?7
                 WHERE id = ?8",
                params![
                    artifact_id,
                    record.analysis_type,
                    package_name,
                    record.time_range_json,
                    record.result_json,
                    record.status,
                    record.created_at,
                    id,
                ],
            )
            .map_err(db_err)?;
        } else {
            conn.execute(
                "INSERT INTO performance_trace_analyses (
                    id, artifact_id, analysis_type, package_name,
                    time_range_json, result_json, status, created_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    id,
                    artifact_id,
                    record.analysis_type,
                    package_name,
                    record.time_range_json,
                    record.result_json,
                    record.status,
                    record.created_at,
                ],
            )
            .map_err(db_err)?;
        }

        Self::read_analysis(conn, id)?
            .ok_or_else(|| format!("保存后 analysis 不存在: {id}"))
    }

    pub fn list_analyses(
        conn: &Connection,
        artifact_id: &str,
        limit: u32,
    ) -> Result<Vec<PerformanceTraceAnalysisRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, artifact_id, analysis_type, package_name,
                        time_range_json, result_json, status, created_at
                 FROM performance_trace_analyses
                 WHERE artifact_id = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![artifact_id, limit], row_to_analysis)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    pub fn read_analysis(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<PerformanceTraceAnalysisRecord>, String> {
        conn.query_row(
            "SELECT id, artifact_id, analysis_type, package_name,
                    time_range_json, result_json, status, created_at
             FROM performance_trace_analyses
             WHERE id = ?1",
            params![id],
            row_to_analysis,
        )
        .optional()
        .map_err(db_err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::schema;

    fn now_millis() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }

    fn open_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("打开内存数据库");
        schema::create_tables(&conn).expect("create tables");
        conn
    }

    #[test]
    fn save_and_list_artifact() {
        let conn = open_test_db();
        let record = PerformanceTraceArtifactRecord {
            id: "trace-1".to_string(),
            workspace_id: "ws-1".to_string(),
            linked_session_id: None,
            device_id: "dev-1".to_string(),
            device_platform: "android".to_string(),
            package_name: "com.example.app".to_string(),
            preset_id: "scroll_jank".to_string(),
            config_json: Some("buffers { ... }".to_string()),
            local_path: Some("/tmp/trace-1.perfetto-trace".to_string()),
            remote_path: Some("/data/local/tmp/trace-1".to_string()),
            size_bytes: Some(1024),
            duration_ms: Some(5000),
            status: "ready".to_string(),
            error_message: None,
            created_at: now_millis(),
            stopped_at: Some(now_millis()),
        };
        PerfTraceDao::save_artifact(&conn, record).expect("保存 artifact");
        let artifacts = PerfTraceDao::list_artifacts(&conn, "ws-1", 50, 0).expect("列出 artifact");
        assert_eq!(artifacts.len(), 1);
        assert_eq!(artifacts[0].preset_id, "scroll_jank");
    }

    #[test]
    fn save_and_list_analysis() {
        let conn = open_test_db();
        let artifact = PerformanceTraceArtifactRecord {
            id: "trace-2".to_string(),
            workspace_id: "ws-1".to_string(),
            linked_session_id: None,
            device_id: "dev-1".to_string(),
            device_platform: "android".to_string(),
            package_name: "com.example.app".to_string(),
            preset_id: "cold_start".to_string(),
            config_json: None,
            local_path: None,
            remote_path: None,
            size_bytes: None,
            duration_ms: None,
            status: "recording".to_string(),
            error_message: None,
            created_at: now_millis(),
            stopped_at: None,
        };
        PerfTraceDao::save_artifact(&conn, artifact).expect("保存 artifact");

        let analysis = PerformanceTraceAnalysisRecord {
            id: "analysis-1".to_string(),
            artifact_id: "trace-2".to_string(),
            analysis_type: "jank_summary".to_string(),
            package_name: "com.example.app".to_string(),
            time_range_json: None,
            result_json: Some(r#"{"jankCount":3}"#.to_string()),
            status: "done".to_string(),
            created_at: now_millis(),
        };
        PerfTraceDao::save_analysis(&conn, analysis).expect("保存 analysis");
        let analyses =
            PerfTraceDao::list_analyses(&conn, "trace-2", 10).expect("列出 analysis");
        assert_eq!(analyses.len(), 1);
        assert_eq!(analyses[0].analysis_type, "jank_summary");
    }

    #[test]
    fn delete_artifact_cascades_analyses() {
        let conn = open_test_db();
        let artifact = PerformanceTraceArtifactRecord {
            id: "trace-del".to_string(),
            workspace_id: "ws-1".to_string(),
            linked_session_id: None,
            device_id: "dev-1".to_string(),
            device_platform: "android".to_string(),
            package_name: "com.example.app".to_string(),
            preset_id: "cpu_sched".to_string(),
            config_json: None,
            local_path: None,
            remote_path: None,
            size_bytes: None,
            duration_ms: None,
            status: "ready".to_string(),
            error_message: None,
            created_at: now_millis(),
            stopped_at: None,
        };
        PerfTraceDao::save_artifact(&conn, artifact).expect("保存 artifact");
        let deleted = PerfTraceDao::delete_artifact(&conn, "trace-del").expect("删除 artifact");
        assert!(deleted);
        assert!(PerfTraceDao::read_artifact(&conn, "trace-del")
            .expect("读取")
            .is_none());
    }
}
