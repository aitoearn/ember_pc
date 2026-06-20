//! 探索压测运行留痕 DAO（`device_explore_runs`）。

use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceExploreRunRecord {
    pub id: String,
    pub workspace_id: String,
    pub session_id: String,
    pub device_id: String,
    pub package_name: String,
    pub engine_mode: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub conclusion: String,
    pub event_count: i64,
    pub throttle_ms: i64,
    pub running_minutes: i64,
    pub seed: Option<i64>,
    pub events_injected: i64,
    pub crash_count: i64,
    pub anr_count: i64,
    pub explore_rules_count: i64,
    pub rule_failures_count: i64,
    pub local_result_dir: Option<String>,
    pub bug_report_path: Option<String>,
    pub steps_log_path: Option<String>,
    pub steps_summary_json: Option<String>,
    pub summary: String,
}

pub struct DeviceExploreRunDao;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn db_err(error: impl std::fmt::Display) -> String {
    format!("探索压测运行留痕数据库操作失败: {error}")
}

fn row_to_run(row: &Row<'_>) -> Result<DeviceExploreRunRecord, rusqlite::Error> {
    Ok(DeviceExploreRunRecord {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        session_id: row.get(2)?,
        device_id: row.get(3)?,
        package_name: row.get(4)?,
        engine_mode: row.get(5)?,
        started_at: row.get(6)?,
        finished_at: row.get(7)?,
        conclusion: row.get(8)?,
        event_count: row.get(9)?,
        throttle_ms: row.get(10)?,
        running_minutes: row.get(11)?,
        seed: row.get(12)?,
        events_injected: row.get(13)?,
        crash_count: row.get(14)?,
        anr_count: row.get(15)?,
        explore_rules_count: row.get(16)?,
        rule_failures_count: row.get(17)?,
        local_result_dir: row.get(18)?,
        bug_report_path: row.get(19)?,
        steps_log_path: row.get(20)?,
        steps_summary_json: row.get(21)?,
        summary: row.get(22)?,
    })
}

impl DeviceExploreRunDao {
    pub fn save(conn: &Connection, mut run: DeviceExploreRunRecord) -> Result<String, String> {
        if run.workspace_id.trim().is_empty() {
            return Err("探索运行缺少 workspaceId".to_string());
        }
        if run.id.trim().is_empty() {
            run.id = Uuid::new_v4().to_string();
        }
        if run.started_at.trim().is_empty() {
            run.started_at = now_iso();
        }
        conn.execute(
            "INSERT OR REPLACE INTO device_explore_runs
                (id, workspace_id, session_id, device_id, package_name, engine_mode,
                 started_at, finished_at, conclusion, event_count, throttle_ms,
                 running_minutes, seed, events_injected, crash_count, anr_count,
                 explore_rules_count, rule_failures_count, local_result_dir,
                 bug_report_path, steps_log_path, steps_summary_json, summary)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
                     ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
            params![
                run.id,
                run.workspace_id,
                run.session_id,
                run.device_id,
                run.package_name,
                run.engine_mode,
                run.started_at,
                run.finished_at,
                run.conclusion,
                run.event_count,
                run.throttle_ms,
                run.running_minutes,
                run.seed,
                run.events_injected,
                run.crash_count,
                run.anr_count,
                run.explore_rules_count,
                run.rule_failures_count,
                run.local_result_dir,
                run.bug_report_path,
                run.steps_log_path,
                run.steps_summary_json,
                run.summary,
            ],
        )
        .map_err(db_err)?;
        Ok(run.id)
    }

    pub fn list(
        conn: &Connection,
        workspace_id: &str,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<DeviceExploreRunRecord>, String> {
        let limit = limit.unwrap_or(50).clamp(1, 500);
        let offset = offset.unwrap_or(0).max(0);
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, session_id, device_id, package_name, engine_mode,
                        started_at, finished_at, conclusion, event_count, throttle_ms,
                        running_minutes, seed, events_injected, crash_count, anr_count,
                        explore_rules_count, rule_failures_count, local_result_dir,
                        bug_report_path, steps_log_path, steps_summary_json, summary
                 FROM device_explore_runs
                 WHERE workspace_id = ?1
                 ORDER BY started_at DESC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![workspace_id, limit, offset], row_to_run)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    pub fn read(conn: &Connection, run_id: &str) -> Result<Option<DeviceExploreRunRecord>, String> {
        conn.query_row(
            "SELECT id, workspace_id, session_id, device_id, package_name, engine_mode,
                    started_at, finished_at, conclusion, event_count, throttle_ms,
                    running_minutes, seed, events_injected, crash_count, anr_count,
                    explore_rules_count, rule_failures_count, local_result_dir,
                    bug_report_path, steps_log_path, steps_summary_json, summary
             FROM device_explore_runs WHERE id = ?1",
            params![run_id],
            row_to_run,
        )
        .optional()
        .map_err(db_err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::schema;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        schema::create_tables(&conn).expect("create tables");
        conn
    }

    #[test]
    fn round_trip_run() {
        let conn = setup();
        let run = DeviceExploreRunRecord {
            id: "run-1".to_string(),
            workspace_id: "ws-1".to_string(),
            session_id: "sess-1".to_string(),
            device_id: "dev-1".to_string(),
            package_name: "com.demo".to_string(),
            engine_mode: "fastbot".to_string(),
            started_at: "2026-06-18T00:00:00Z".to_string(),
            finished_at: Some("2026-06-18T00:05:00Z".to_string()),
            conclusion: "completed".to_string(),
            event_count: 100,
            throttle_ms: 300,
            running_minutes: 5,
            seed: None,
            events_injected: 42,
            crash_count: 0,
            anr_count: 0,
            explore_rules_count: 2,
            rule_failures_count: 1,
            local_result_dir: None,
            bug_report_path: None,
            steps_log_path: None,
            steps_summary_json: None,
            summary: "demo".to_string(),
        };
        DeviceExploreRunDao::save(&conn, run).expect("save");
        let listed = DeviceExploreRunDao::list(&conn, "ws-1", None, None).expect("list");
        assert_eq!(listed.len(), 1);
        let read = DeviceExploreRunDao::read(&conn, "run-1").expect("read");
        assert!(read.is_some());
    }
}
