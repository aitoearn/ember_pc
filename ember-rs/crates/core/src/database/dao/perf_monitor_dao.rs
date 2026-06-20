//! 性能监控会话数据访问层。

use rusqlite::{params, Connection, OptionalExtension, Row};

/// 性能会话数据库记录。
#[derive(Debug, Clone, PartialEq)]
pub struct PerformanceSessionRecord {
    pub id: String,
    pub workspace_id: String,
    pub device_id: String,
    pub device_platform: String,
    pub package_name: String,
    pub metrics_json: String,
    pub interval_ms: i64,
    pub status: String,
    pub started_at: i64,
    pub stopped_at: Option<i64>,
    pub summary_json: Option<String>,
}

pub struct PerfMonitorDao;

const VALID_STATUSES: &[&str] = &["running", "stopped", "failed"];

fn now_millis() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn db_err(error: impl std::fmt::Display) -> String {
    format!("性能监控数据库操作失败: {error}")
}

fn row_to_session(row: &Row<'_>) -> rusqlite::Result<PerformanceSessionRecord> {
    Ok(PerformanceSessionRecord {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        device_id: row.get(2)?,
        device_platform: row.get(3)?,
        package_name: row.get(4)?,
        metrics_json: row.get(5)?,
        interval_ms: row.get(6)?,
        status: row.get(7)?,
        started_at: row.get(8)?,
        stopped_at: row.get(9)?,
        summary_json: row.get(10)?,
    })
}

impl PerfMonitorDao {
    pub fn save_session(
        conn: &Connection,
        record: PerformanceSessionRecord,
    ) -> Result<PerformanceSessionRecord, String> {
        let id = record.id.trim();
        let workspace_id = record.workspace_id.trim();
        let device_id = record.device_id.trim();
        let package_name = record.package_name.trim();
        if id.is_empty() {
            return Err("会话 id 不能为空".to_string());
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
        if !VALID_STATUSES.contains(&record.status.as_str()) {
            return Err(format!("非法会话状态: {}", record.status));
        }

        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM performance_sessions WHERE id = ?1",
                params![id],
                |_| Ok(true),
            )
            .optional()
            .map_err(db_err)?
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE performance_sessions SET
                    workspace_id = ?1,
                    device_id = ?2,
                    device_platform = ?3,
                    package_name = ?4,
                    metrics_json = ?5,
                    interval_ms = ?6,
                    status = ?7,
                    started_at = ?8,
                    stopped_at = ?9,
                    summary_json = ?10
                 WHERE id = ?11",
                params![
                    workspace_id,
                    device_id,
                    record.device_platform,
                    package_name,
                    record.metrics_json,
                    record.interval_ms,
                    record.status,
                    record.started_at,
                    record.stopped_at,
                    record.summary_json,
                    id,
                ],
            )
            .map_err(db_err)?;
        } else {
            conn.execute(
                "INSERT INTO performance_sessions (
                    id, workspace_id, device_id, device_platform, package_name,
                    metrics_json, interval_ms, status, started_at, stopped_at, summary_json
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    id,
                    workspace_id,
                    device_id,
                    record.device_platform,
                    package_name,
                    record.metrics_json,
                    record.interval_ms,
                    record.status,
                    record.started_at,
                    record.stopped_at,
                    record.summary_json,
                ],
            )
            .map_err(db_err)?;
        }

        Self::read_session(conn, id)?
            .ok_or_else(|| format!("保存后会话不存在: {id}"))
    }

    pub fn list_sessions(
        conn: &Connection,
        workspace_id: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<PerformanceSessionRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, device_id, device_platform, package_name,
                        metrics_json, interval_ms, status, started_at, stopped_at, summary_json
                 FROM performance_sessions
                 WHERE workspace_id = ?1
                 ORDER BY started_at DESC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![workspace_id, limit, offset], row_to_session)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    pub fn read_session(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<PerformanceSessionRecord>, String> {
        conn.query_row(
            "SELECT id, workspace_id, device_id, device_platform, package_name,
                    metrics_json, interval_ms, status, started_at, stopped_at, summary_json
             FROM performance_sessions
             WHERE id = ?1",
            params![id],
            row_to_session,
        )
        .optional()
        .map_err(db_err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::schema;

    fn open_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("打开内存数据库");
        schema::create_tables(&conn).expect("create tables");
        conn
    }

    #[test]
    fn save_and_list_session() {
        let conn = open_test_db();
        let record = PerformanceSessionRecord {
            id: "sess-1".to_string(),
            workspace_id: "ws-1".to_string(),
            device_id: "dev-1".to_string(),
            device_platform: "android".to_string(),
            package_name: "com.example.app".to_string(),
            metrics_json: r#"["cpu","memory"]"#.to_string(),
            interval_ms: 1000,
            status: "stopped".to_string(),
            started_at: now_millis(),
            stopped_at: Some(now_millis()),
            summary_json: Some(r#"{"cpu_app":{"avg":1.0,"max":2.0,"min":0.5}}"#.to_string()),
        };
        PerfMonitorDao::save_session(&conn, record).expect("保存会话");
        let sessions = PerfMonitorDao::list_sessions(&conn, "ws-1", 50, 0).expect("列出会话");
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].package_name, "com.example.app");
    }

    #[test]
    fn reject_invalid_status() {
        let conn = open_test_db();
        let record = PerformanceSessionRecord {
            id: "sess-2".to_string(),
            workspace_id: "ws-1".to_string(),
            device_id: "dev-1".to_string(),
            device_platform: "android".to_string(),
            package_name: "com.example.app".to_string(),
            metrics_json: "[]".to_string(),
            interval_ms: 1000,
            status: "unknown".to_string(),
            started_at: now_millis(),
            stopped_at: None,
            summary_json: None,
        };
        let err = PerfMonitorDao::save_session(&conn, record).expect_err("应拒绝非法状态");
        assert!(err.contains("非法会话状态"));
    }
}
