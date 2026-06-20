//! 确定性可复现测试流与自愈回放数据访问层（spec 003）。
//!
//! 覆盖四张表：
//! - `device_flows`：流定义，步骤内联 `steps_json`（照 `test_cases` 惯例）
//! - `device_flow_runs` / `device_flow_run_steps`：确定性回放留痕
//! - `device_flow_healing_revisions`：自愈待确认修订
//!
//! 定位/断言等复杂结构以 JSON 字符串列存储，由上层（app-server 的 local_data_source）
//! 解析为协议类型。时间戳统一 ISO 8601 字符串。

use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

/// 测试流记录（对应 `device_flows` 表）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceFlowRecord {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub app_package: String,
    pub platform: String,
    pub format_version: i64,
    pub source: String,
    pub self_healing_enabled: bool,
    pub steps_json: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 回放记录（对应 `device_flow_runs` 表）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceFlowRunRecord {
    pub id: String,
    pub flow_id: String,
    pub workspace_id: String,
    pub device_id: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub conclusion: String,
    pub healing_triggered: bool,
    pub llm_token_used: i64,
    pub summary: String,
}

/// 回放步骤留痕（对应 `device_flow_run_steps` 表，(run_id, idx) 复合主键）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceFlowRunStepRecord {
    pub run_id: String,
    pub idx: i64,
    pub op: String,
    pub locator_used_json: Option<String>,
    pub status: String,
    pub assert_result_json: Option<String>,
    pub screenshot_path: Option<String>,
    pub duration_ms: i64,
}

/// 自愈修订记录（对应 `device_flow_healing_revisions` 表）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceFlowHealingRevisionRecord {
    pub id: String,
    pub flow_id: String,
    pub step_index: i64,
    pub run_id: String,
    pub original_locators_json: String,
    pub healed_locator_json: String,
    pub evidence_screenshot_path: Option<String>,
    pub status: String,
    pub created_at: String,
}

/// 确定性测试流 DAO。
pub struct DeviceFlowDao;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn db_err(error: impl std::fmt::Display) -> String {
    format!("确定性测试流数据库操作失败: {error}")
}

impl DeviceFlowDao {
    // ------------------------------------------------------------------------
    // 流 CRUD
    // ------------------------------------------------------------------------

    /// 列出工作区全部流（按更新时间倒序）。
    pub fn list_flows(
        conn: &Connection,
        workspace_id: &str,
    ) -> Result<Vec<DeviceFlowRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, workspace_id, name, app_package, platform, format_version,
                        source, self_healing_enabled, steps_json, created_at, updated_at
                 FROM device_flows
                 WHERE workspace_id = ?1
                 ORDER BY updated_at DESC",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![workspace_id], row_to_flow)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    /// 按 id 读取单条流（含 steps_json）。
    pub fn read_flow(conn: &Connection, id: &str) -> Result<Option<DeviceFlowRecord>, String> {
        conn.query_row(
            "SELECT id, workspace_id, name, app_package, platform, format_version,
                    source, self_healing_enabled, steps_json, created_at, updated_at
             FROM device_flows WHERE id = ?1",
            params![id],
            row_to_flow,
        )
        .optional()
        .map_err(db_err)
    }

    /// upsert 一条流（按 id；id 为空则新建）。校验 name / app_package 非空。
    pub fn save_flow(
        conn: &Connection,
        workspace_id: &str,
        mut record: DeviceFlowRecord,
    ) -> Result<DeviceFlowRecord, String> {
        let name = record.name.trim();
        if name.is_empty() {
            return Err("流名称不能为空".to_string());
        }
        let app_package = record.app_package.trim();
        if app_package.is_empty() {
            return Err("目标应用包名不能为空".to_string());
        }

        let now = now_iso();
        let existing_created = if record.id.trim().is_empty() {
            None
        } else {
            conn.query_row(
                "SELECT created_at FROM device_flows WHERE id = ?1 AND workspace_id = ?2",
                params![record.id, workspace_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(db_err)?
        };

        match existing_created {
            Some(created_at) => {
                conn.execute(
                    "UPDATE device_flows SET
                        name = ?1, app_package = ?2, platform = ?3, format_version = ?4,
                        source = ?5, self_healing_enabled = ?6, steps_json = ?7, updated_at = ?8
                     WHERE id = ?9 AND workspace_id = ?10",
                    params![
                        name,
                        app_package,
                        record.platform,
                        record.format_version,
                        record.source,
                        record.self_healing_enabled,
                        record.steps_json,
                        now,
                        record.id,
                        workspace_id
                    ],
                )
                .map_err(db_err)?;
                record.created_at = created_at;
                record.updated_at = now;
            }
            None => {
                if record.id.trim().is_empty() {
                    record.id = Uuid::new_v4().to_string();
                }
                conn.execute(
                    "INSERT INTO device_flows
                        (id, workspace_id, name, app_package, platform, format_version,
                         source, self_healing_enabled, steps_json, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![
                        record.id,
                        workspace_id,
                        name,
                        app_package,
                        record.platform,
                        record.format_version,
                        record.source,
                        record.self_healing_enabled,
                        record.steps_json,
                        now,
                        now
                    ],
                )
                .map_err(db_err)?;
                record.created_at = now.clone();
                record.updated_at = now;
            }
        }
        record.name = name.to_string();
        record.app_package = app_package.to_string();
        Ok(record)
    }

    /// 批量删除流，级联删除其 runs / run_steps / healing_revisions，返回删除流条数。
    pub fn delete_flows(conn: &Connection, ids: &[String]) -> Result<u32, String> {
        let mut deleted = 0u32;
        for id in ids {
            // 先删该流的回放步骤（经 runs 关联）
            conn.execute(
                "DELETE FROM device_flow_run_steps
                 WHERE run_id IN (SELECT id FROM device_flow_runs WHERE flow_id = ?1)",
                params![id],
            )
            .map_err(db_err)?;
            conn.execute(
                "DELETE FROM device_flow_runs WHERE flow_id = ?1",
                params![id],
            )
            .map_err(db_err)?;
            conn.execute(
                "DELETE FROM device_flow_healing_revisions WHERE flow_id = ?1",
                params![id],
            )
            .map_err(db_err)?;
            let affected = conn
                .execute("DELETE FROM device_flows WHERE id = ?1", params![id])
                .map_err(db_err)?;
            deleted += affected as u32;
        }
        Ok(deleted)
    }

    // ------------------------------------------------------------------------
    // 回放记录
    // ------------------------------------------------------------------------

    /// 保存一次回放（run + 全部 run_steps），按 run.id upsert 并整体替换步骤。
    pub fn save_run(
        conn: &Connection,
        mut run: DeviceFlowRunRecord,
        steps: &[DeviceFlowRunStepRecord],
    ) -> Result<String, String> {
        if run.flow_id.trim().is_empty() {
            return Err("回放记录缺少关联流 id".to_string());
        }
        if run.id.trim().is_empty() {
            run.id = Uuid::new_v4().to_string();
        }
        if run.started_at.trim().is_empty() {
            run.started_at = now_iso();
        }
        conn.execute(
            "INSERT OR REPLACE INTO device_flow_runs
                (id, flow_id, workspace_id, device_id, started_at, finished_at,
                 conclusion, healing_triggered, llm_token_used, summary)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                run.id,
                run.flow_id,
                run.workspace_id,
                run.device_id,
                run.started_at,
                run.finished_at,
                run.conclusion,
                run.healing_triggered,
                run.llm_token_used,
                run.summary
            ],
        )
        .map_err(db_err)?;
        conn.execute(
            "DELETE FROM device_flow_run_steps WHERE run_id = ?1",
            params![run.id],
        )
        .map_err(db_err)?;
        for step in steps {
            conn.execute(
                "INSERT INTO device_flow_run_steps
                    (run_id, idx, op, locator_used_json, status, assert_result_json,
                     screenshot_path, duration_ms)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    run.id,
                    step.idx,
                    step.op,
                    step.locator_used_json,
                    step.status,
                    step.assert_result_json,
                    step.screenshot_path,
                    step.duration_ms
                ],
            )
            .map_err(db_err)?;
        }
        Ok(run.id)
    }

    /// 列出某条流的回放记录（不含 steps，按开始时间倒序，支持分页）。
    pub fn list_runs(
        conn: &Connection,
        flow_id: &str,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<DeviceFlowRunRecord>, String> {
        let limit = limit.unwrap_or(50).clamp(1, 500);
        let offset = offset.unwrap_or(0).max(0);
        let mut stmt = conn
            .prepare(
                "SELECT id, flow_id, workspace_id, device_id, started_at, finished_at,
                        conclusion, healing_triggered, llm_token_used, summary
                 FROM device_flow_runs
                 WHERE flow_id = ?1
                 ORDER BY started_at DESC
                 LIMIT ?2 OFFSET ?3",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![flow_id, limit, offset], row_to_run)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    /// 按 id 读取一次回放（含全部步骤，步骤按 idx 升序）。
    pub fn read_run(
        conn: &Connection,
        run_id: &str,
    ) -> Result<Option<(DeviceFlowRunRecord, Vec<DeviceFlowRunStepRecord>)>, String> {
        let run = conn
            .query_row(
                "SELECT id, flow_id, workspace_id, device_id, started_at, finished_at,
                        conclusion, healing_triggered, llm_token_used, summary
                 FROM device_flow_runs WHERE id = ?1",
                params![run_id],
                row_to_run,
            )
            .optional()
            .map_err(db_err)?;
        match run {
            Some(run) => {
                let steps = Self::list_run_steps(conn, &run.id)?;
                Ok(Some((run, steps)))
            }
            None => Ok(None),
        }
    }

    fn list_run_steps(
        conn: &Connection,
        run_id: &str,
    ) -> Result<Vec<DeviceFlowRunStepRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT run_id, idx, op, locator_used_json, status, assert_result_json,
                        screenshot_path, duration_ms
                 FROM device_flow_run_steps
                 WHERE run_id = ?1
                 ORDER BY idx ASC",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![run_id], row_to_run_step)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    // ------------------------------------------------------------------------
    // 自愈修订
    // ------------------------------------------------------------------------

    /// 列出某条流的自愈修订（可选按状态过滤，按生成时间倒序）。
    pub fn list_healing(
        conn: &Connection,
        flow_id: &str,
        status: Option<&str>,
    ) -> Result<Vec<DeviceFlowHealingRevisionRecord>, String> {
        let base = "SELECT id, flow_id, step_index, run_id, original_locators_json,
                           healed_locator_json, evidence_screenshot_path, status, created_at
                    FROM device_flow_healing_revisions
                    WHERE flow_id = ?1";
        match status {
            Some(status) => {
                let mut stmt = conn
                    .prepare(&format!("{base} AND status = ?2 ORDER BY created_at DESC"))
                    .map_err(db_err)?;
                let rows = stmt
                    .query_map(params![flow_id, status], row_to_healing)
                    .map_err(db_err)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(db_err)?;
                Ok(rows)
            }
            None => {
                let mut stmt = conn
                    .prepare(&format!("{base} ORDER BY created_at DESC"))
                    .map_err(db_err)?;
                let rows = stmt
                    .query_map(params![flow_id], row_to_healing)
                    .map_err(db_err)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(db_err)?;
                Ok(rows)
            }
        }
    }

    /// upsert 一条自愈修订（按 id；id 为空则新建，status 默认 pending）。
    pub fn save_healing(
        conn: &Connection,
        mut record: DeviceFlowHealingRevisionRecord,
    ) -> Result<DeviceFlowHealingRevisionRecord, String> {
        if record.flow_id.trim().is_empty() {
            return Err("自愈修订缺少关联流 id".to_string());
        }
        if record.id.trim().is_empty() {
            record.id = Uuid::new_v4().to_string();
        }
        if record.status.trim().is_empty() {
            record.status = "pending".to_string();
        }
        if record.created_at.trim().is_empty() {
            record.created_at = now_iso();
        }
        conn.execute(
            "INSERT OR REPLACE INTO device_flow_healing_revisions
                (id, flow_id, step_index, run_id, original_locators_json,
                 healed_locator_json, evidence_screenshot_path, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.id,
                record.flow_id,
                record.step_index,
                record.run_id,
                record.original_locators_json,
                record.healed_locator_json,
                record.evidence_screenshot_path,
                record.status,
                record.created_at
            ],
        )
        .map_err(db_err)?;
        Ok(record)
    }

    /// 按 id 读取单条自愈修订。
    pub fn get_healing(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<DeviceFlowHealingRevisionRecord>, String> {
        conn.query_row(
            "SELECT id, flow_id, step_index, run_id, original_locators_json,
                    healed_locator_json, evidence_screenshot_path, status, created_at
             FROM device_flow_healing_revisions WHERE id = ?1",
            params![id],
            row_to_healing,
        )
        .optional()
        .map_err(db_err)
    }

    /// 更新自愈修订状态（accepted / flagged_defect）。locator 并入流由上层处理。
    pub fn update_healing_status(
        conn: &Connection,
        id: &str,
        status: &str,
    ) -> Result<bool, String> {
        let affected = conn
            .execute(
                "UPDATE device_flow_healing_revisions SET status = ?1 WHERE id = ?2",
                params![status, id],
            )
            .map_err(db_err)?;
        Ok(affected > 0)
    }
}

fn row_to_flow(row: &Row<'_>) -> Result<DeviceFlowRecord, rusqlite::Error> {
    Ok(DeviceFlowRecord {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        name: row.get(2)?,
        app_package: row.get(3)?,
        platform: row.get(4)?,
        format_version: row.get(5)?,
        source: row.get(6)?,
        self_healing_enabled: row.get(7)?,
        steps_json: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

fn row_to_run(row: &Row<'_>) -> Result<DeviceFlowRunRecord, rusqlite::Error> {
    Ok(DeviceFlowRunRecord {
        id: row.get(0)?,
        flow_id: row.get(1)?,
        workspace_id: row.get(2)?,
        device_id: row.get(3)?,
        started_at: row.get(4)?,
        finished_at: row.get(5)?,
        conclusion: row.get(6)?,
        healing_triggered: row.get(7)?,
        llm_token_used: row.get(8)?,
        summary: row.get(9)?,
    })
}

fn row_to_run_step(row: &Row<'_>) -> Result<DeviceFlowRunStepRecord, rusqlite::Error> {
    Ok(DeviceFlowRunStepRecord {
        run_id: row.get(0)?,
        idx: row.get(1)?,
        op: row.get(2)?,
        locator_used_json: row.get(3)?,
        status: row.get(4)?,
        assert_result_json: row.get(5)?,
        screenshot_path: row.get(6)?,
        duration_ms: row.get(7)?,
    })
}

fn row_to_healing(row: &Row<'_>) -> Result<DeviceFlowHealingRevisionRecord, rusqlite::Error> {
    Ok(DeviceFlowHealingRevisionRecord {
        id: row.get(0)?,
        flow_id: row.get(1)?,
        step_index: row.get(2)?,
        run_id: row.get(3)?,
        original_locators_json: row.get(4)?,
        healed_locator_json: row.get(5)?,
        evidence_screenshot_path: row.get(6)?,
        status: row.get(7)?,
        created_at: row.get(8)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::schema;

    const WS: &str = "ws-flow";

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        schema::create_tables(&conn).expect("create tables");
        conn
    }

    fn sample_flow(name: &str) -> DeviceFlowRecord {
        DeviceFlowRecord {
            id: String::new(),
            workspace_id: WS.to_string(),
            name: name.to_string(),
            app_package: "com.example.app".to_string(),
            platform: "android".to_string(),
            format_version: 1,
            source: "vlm_recorded".to_string(),
            self_healing_enabled: true,
            steps_json: r#"[{"index":0,"op":"back"}]"#.to_string(),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn flow_upsert_list_read_delete_round_trips() {
        let conn = setup();
        let saved = DeviceFlowDao::save_flow(&conn, WS, sample_flow("登录冒烟")).unwrap();
        assert!(!saved.id.is_empty());
        assert!(!saved.created_at.is_empty());

        let listed = DeviceFlowDao::list_flows(&conn, WS).unwrap();
        assert_eq!(listed.len(), 1);

        let read = DeviceFlowDao::read_flow(&conn, &saved.id).unwrap().unwrap();
        assert_eq!(read.name, "登录冒烟");
        assert!(read.self_healing_enabled);

        // 按 id 更新不新增
        let mut update = saved.clone();
        update.name = "登录冒烟（改）".to_string();
        let updated = DeviceFlowDao::save_flow(&conn, WS, update).unwrap();
        assert_eq!(updated.id, saved.id);
        assert_eq!(updated.created_at, saved.created_at);
        assert_eq!(DeviceFlowDao::list_flows(&conn, WS).unwrap().len(), 1);

        let deleted = DeviceFlowDao::delete_flows(&conn, &[saved.id.clone()]).unwrap();
        assert_eq!(deleted, 1);
        assert_eq!(DeviceFlowDao::list_flows(&conn, WS).unwrap().len(), 0);
    }

    #[test]
    fn empty_name_or_package_rejected() {
        let conn = setup();
        let mut bad = sample_flow("  ");
        assert!(DeviceFlowDao::save_flow(&conn, WS, bad.clone()).is_err());
        bad = sample_flow("ok");
        bad.app_package = "  ".to_string();
        assert!(DeviceFlowDao::save_flow(&conn, WS, bad).is_err());
    }

    #[test]
    fn run_save_read_and_list_round_trips() {
        let conn = setup();
        let flow = DeviceFlowDao::save_flow(&conn, WS, sample_flow("回放流")).unwrap();

        let run = DeviceFlowRunRecord {
            id: String::new(),
            flow_id: flow.id.clone(),
            workspace_id: WS.to_string(),
            device_id: "device-1".to_string(),
            started_at: String::new(),
            finished_at: Some("2026-06-17T00:00:01Z".to_string()),
            conclusion: "passed".to_string(),
            healing_triggered: false,
            llm_token_used: 0,
            summary: "全部通过".to_string(),
        };
        let steps = vec![
            DeviceFlowRunStepRecord {
                run_id: String::new(),
                idx: 0,
                op: "launch_app".to_string(),
                locator_used_json: None,
                status: "passed".to_string(),
                assert_result_json: None,
                screenshot_path: Some("/tmp/0.png".to_string()),
                duration_ms: 120,
            },
            DeviceFlowRunStepRecord {
                run_id: String::new(),
                idx: 1,
                op: "tap".to_string(),
                locator_used_json: Some(r#"{"kind":"resource_id","value":"btn"}"#.to_string()),
                status: "passed".to_string(),
                assert_result_json: Some(r#"{"ok":true}"#.to_string()),
                screenshot_path: None,
                duration_ms: 80,
            },
        ];
        let run_id = DeviceFlowDao::save_run(&conn, run, &steps).unwrap();
        assert!(!run_id.is_empty());

        let (read_run, read_steps) = DeviceFlowDao::read_run(&conn, &run_id).unwrap().unwrap();
        assert_eq!(read_run.conclusion, "passed");
        assert_eq!(read_run.llm_token_used, 0);
        assert_eq!(read_steps.len(), 2);
        assert_eq!(read_steps[0].op, "launch_app");
        assert_eq!(read_steps[1].idx, 1);

        let runs = DeviceFlowDao::list_runs(&conn, &flow.id, None, None).unwrap();
        assert_eq!(runs.len(), 1);

        // 删除流应级联删除 run 与 run_steps
        DeviceFlowDao::delete_flows(&conn, &[flow.id.clone()]).unwrap();
        assert!(DeviceFlowDao::read_run(&conn, &run_id).unwrap().is_none());
    }

    #[test]
    fn healing_save_list_and_resolve_round_trips() {
        let conn = setup();
        let flow = DeviceFlowDao::save_flow(&conn, WS, sample_flow("自愈流")).unwrap();

        let revision = DeviceFlowHealingRevisionRecord {
            id: String::new(),
            flow_id: flow.id.clone(),
            step_index: 1,
            run_id: "run-1".to_string(),
            original_locators_json: r#"[{"kind":"resource_id","value":"old"}]"#.to_string(),
            healed_locator_json: r#"{"kind":"text","value":"登录"}"#.to_string(),
            evidence_screenshot_path: Some("/tmp/diff.png".to_string()),
            status: String::new(),
            created_at: String::new(),
        };
        let saved = DeviceFlowDao::save_healing(&conn, revision).unwrap();
        assert_eq!(saved.status, "pending");

        let pending =
            DeviceFlowDao::list_healing(&conn, &flow.id, Some("pending")).unwrap();
        assert_eq!(pending.len(), 1);

        // 解决为已接受
        assert!(DeviceFlowDao::update_healing_status(&conn, &saved.id, "accepted").unwrap());
        let got = DeviceFlowDao::get_healing(&conn, &saved.id).unwrap().unwrap();
        assert_eq!(got.status, "accepted");
        assert!(DeviceFlowDao::list_healing(&conn, &flow.id, Some("pending"))
            .unwrap()
            .is_empty());

        // 删除流级联删除修订
        DeviceFlowDao::delete_flows(&conn, &[flow.id.clone()]).unwrap();
        assert!(DeviceFlowDao::get_healing(&conn, &saved.id).unwrap().is_none());
    }
}
