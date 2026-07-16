//! 测试用例与测试模块数据访问层。
//!
//! 提供测试模块树与测试用例的 list / upsert / delete 操作，覆盖：
//! - `caseId` 工作区内唯一校验（FR-002a）
//! - 仅空模块可删（FR-001a）
//!
//! `steps`/`assertions`/`tags` 以 JSON 字符串列存储（照 `workspaces.settings_json`
//! 惯例），由上层（app-server 的 local_data_source）解析为协议类型。

use rusqlite::{params, Connection, OptionalExtension, Row};
use uuid::Uuid;

/// 测试模块记录（对应 `test_case_modules` 表）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestCaseModuleRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub order_index: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 测试用例记录（对应 `test_cases` 表）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestCaseRecord {
    pub id: String,
    pub case_id: String,
    pub title: String,
    pub module_id: Option<String>,
    pub priority: String,
    pub case_type: String,
    pub status: String,
    pub source: String,
    pub precondition: String,
    pub steps_json: String,
    pub assertions_json: String,
    pub tags_json: String,
    pub exec_result: String,
    pub remark: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// 用例执行记录（对应 `test_case_runs` 表，US3）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestCaseRunRecord {
    pub id: String,
    pub case_id: String,
    pub device_id: String,
    pub instruction: String,
    pub result: String,
    pub summary: String,
    pub started_at: i64,
    pub finished_at: Option<i64>,
    pub created_at: i64,
    pub steps: Vec<TestCaseRunStepRecord>,
}

/// 执行过程观察步骤（对应 `test_case_run_steps` 表，US3）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TestCaseRunStepRecord {
    pub id: String,
    pub run_id: String,
    pub step_no: i64,
    pub observation: String,
    pub screenshot_path: String,
    pub ts: i64,
}

/// 测试用例 DAO。
pub struct TestCaseDao;

fn now_millis() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn db_err(error: impl std::fmt::Display) -> String {
    format!("测试用例数据库操作失败: {error}")
}

impl TestCaseDao {
    // ------------------------------------------------------------------------
    // 模块
    // ------------------------------------------------------------------------

    /// 列出指定工作区的全部测试模块（按同级排序、再按创建时间）。
    pub fn list_modules(
        conn: &Connection,
        workspace_id: &str,
    ) -> Result<Vec<TestCaseModuleRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, parent_id, order_index, created_at, updated_at
                 FROM test_case_modules
                 WHERE workspace_id = ?1
                 ORDER BY order_index ASC, created_at ASC",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![workspace_id], row_to_module)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }

    /// upsert 一个测试模块（按 id；id 为空则新建）。
    pub fn save_module(
        conn: &Connection,
        workspace_id: &str,
        mut record: TestCaseModuleRecord,
    ) -> Result<TestCaseModuleRecord, String> {
        let name = record.name.trim();
        if name.is_empty() {
            return Err("模块名称不能为空".to_string());
        }
        let now = now_millis();

        let existing_created = if record.id.trim().is_empty() {
            None
        } else {
            conn.query_row(
                "SELECT created_at FROM test_case_modules WHERE id = ?1 AND workspace_id = ?2",
                params![record.id, workspace_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(db_err)?
        };

        match existing_created {
            Some(created_at) => {
                conn.execute(
                    "UPDATE test_case_modules
                     SET name = ?1, parent_id = ?2, order_index = ?3, updated_at = ?4
                     WHERE id = ?5 AND workspace_id = ?6",
                    params![
                        name,
                        record.parent_id,
                        record.order_index,
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
                    "INSERT INTO test_case_modules
                        (id, workspace_id, name, parent_id, order_index, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        record.id,
                        workspace_id,
                        name,
                        record.parent_id,
                        record.order_index,
                        now,
                        now
                    ],
                )
                .map_err(db_err)?;
                record.created_at = now;
                record.updated_at = now;
            }
        }
        record.name = name.to_string();
        Ok(record)
    }

    /// 删除模块（仅空模块可删：无子模块且无用例）。
    pub fn delete_module(
        conn: &Connection,
        workspace_id: &str,
        id: &str,
    ) -> Result<bool, String> {
        let child_modules: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM test_case_modules WHERE workspace_id = ?1 AND parent_id = ?2",
                params![workspace_id, id],
                |row| row.get(0),
            )
            .map_err(db_err)?;
        if child_modules > 0 {
            return Err("该模块下仍有子模块，请先移动或清空后再删除".to_string());
        }
        let child_cases: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM test_cases WHERE workspace_id = ?1 AND module_id = ?2",
                params![workspace_id, id],
                |row| row.get(0),
            )
            .map_err(db_err)?;
        if child_cases > 0 {
            return Err("该模块下仍有用例，请先移动或清空后再删除".to_string());
        }
        let affected = conn
            .execute(
                "DELETE FROM test_case_modules WHERE workspace_id = ?1 AND id = ?2",
                params![workspace_id, id],
            )
            .map_err(db_err)?;
        Ok(affected > 0)
    }

    // ------------------------------------------------------------------------
    // 用例
    // ------------------------------------------------------------------------

    /// 列出工作区用例（可选叠加 moduleId 粗过滤），按更新时间倒序。
    pub fn list_cases(
        conn: &Connection,
        workspace_id: &str,
        module_id: Option<&str>,
    ) -> Result<Vec<TestCaseRecord>, String> {
        let sql = "SELECT id, case_id, title, module_id, priority, case_type, status, source,
                          precondition, steps_json, assertions_json, tags_json, exec_result, remark,
                          created_at, updated_at
                   FROM test_cases
                   WHERE workspace_id = ?1";
        let rows = match module_id {
            Some(module_id) => {
                let mut stmt = conn
                    .prepare(&format!(
                        "{sql} AND module_id = ?2 ORDER BY updated_at DESC"
                    ))
                    .map_err(db_err)?;
                let collected = stmt
                    .query_map(params![workspace_id, module_id], row_to_case)
                    .map_err(db_err)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(db_err)?;
                collected
            }
            None => {
                let mut stmt = conn
                    .prepare(&format!("{sql} ORDER BY updated_at DESC"))
                    .map_err(db_err)?;
                let collected = stmt
                    .query_map(params![workspace_id], row_to_case)
                    .map_err(db_err)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(db_err)?;
                collected
            }
        };
        Ok(rows)
    }

    /// 按内部 id 读取单条用例。
    pub fn read_case(conn: &Connection, id: &str) -> Result<Option<TestCaseRecord>, String> {
        conn.query_row(
            "SELECT id, case_id, title, module_id, priority, case_type, status, source,
                    precondition, steps_json, assertions_json, tags_json, exec_result, remark,
                    created_at, updated_at
             FROM test_cases WHERE id = ?1",
            params![id],
            row_to_case,
        )
        .optional()
        .map_err(db_err)
    }

    /// upsert 一条用例（按 id；id 为空则新建）。校验 title 非空、caseId 工作区内唯一。
    pub fn save_case(
        conn: &Connection,
        workspace_id: &str,
        mut record: TestCaseRecord,
    ) -> Result<TestCaseRecord, String> {
        let title = record.title.trim();
        if title.is_empty() {
            return Err("用例标题不能为空".to_string());
        }
        let case_id = record.case_id.trim();
        if case_id.is_empty() {
            return Err("用例编号（caseId）不能为空".to_string());
        }

        // caseId 工作区内唯一：存在同 caseId 但 id 不同的记录即冲突。
        let conflict: Option<String> = conn
            .query_row(
                "SELECT id FROM test_cases WHERE workspace_id = ?1 AND case_id = ?2",
                params![workspace_id, case_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(db_err)?;
        if let Some(existing_id) = conflict {
            if existing_id != record.id {
                return Err(format!("用例编号 {case_id} 在当前工作区已存在，请改用其他编号"));
            }
        }

        let now = now_millis();
        let existing_created = if record.id.trim().is_empty() {
            None
        } else {
            conn.query_row(
                "SELECT created_at FROM test_cases WHERE id = ?1 AND workspace_id = ?2",
                params![record.id, workspace_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(db_err)?
        };

        match existing_created {
            Some(created_at) => {
                conn.execute(
                    "UPDATE test_cases SET
                        case_id = ?1, title = ?2, module_id = ?3, priority = ?4, case_type = ?5,
                        status = ?6, source = ?7, precondition = ?8, steps_json = ?9,
                        assertions_json = ?10, tags_json = ?11, exec_result = ?12, remark = ?13,
                        updated_at = ?14
                     WHERE id = ?15 AND workspace_id = ?16",
                    params![
                        case_id,
                        title,
                        record.module_id,
                        record.priority,
                        record.case_type,
                        record.status,
                        record.source,
                        record.precondition,
                        record.steps_json,
                        record.assertions_json,
                        record.tags_json,
                        record.exec_result,
                        record.remark,
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
                    "INSERT INTO test_cases
                        (id, workspace_id, case_id, title, module_id, priority, case_type, status,
                         source, precondition, steps_json, assertions_json, tags_json, exec_result,
                         remark, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                    params![
                        record.id,
                        workspace_id,
                        case_id,
                        title,
                        record.module_id,
                        record.priority,
                        record.case_type,
                        record.status,
                        record.source,
                        record.precondition,
                        record.steps_json,
                        record.assertions_json,
                        record.tags_json,
                        record.exec_result,
                        record.remark,
                        now,
                        now
                    ],
                )
                .map_err(db_err)?;
                record.created_at = now;
                record.updated_at = now;
            }
        }
        record.title = title.to_string();
        record.case_id = case_id.to_string();
        Ok(record)
    }

    /// 批量删除用例，返回实际删除条数。
    pub fn delete_cases(conn: &Connection, ids: &[String]) -> Result<u32, String> {
        let mut deleted = 0u32;
        for id in ids {
            let affected = conn
                .execute("DELETE FROM test_cases WHERE id = ?1", params![id])
                .map_err(db_err)?;
            deleted += affected as u32;
        }
        Ok(deleted)
    }

    // ------------------------------------------------------------------------
    // 执行记录（US3）
    // ------------------------------------------------------------------------

    /// 开始一次执行：插入 run（id 为空则生成；started_at/created_at 缺省取当前时间）。
    pub fn start_run(
        conn: &Connection,
        workspace_id: &str,
        mut record: TestCaseRunRecord,
    ) -> Result<TestCaseRunRecord, String> {
        if record.case_id.trim().is_empty() {
            return Err("执行记录缺少关联用例 id".to_string());
        }
        let now = now_millis();
        if record.id.trim().is_empty() {
            record.id = Uuid::new_v4().to_string();
        }
        if record.started_at == 0 {
            record.started_at = now;
        }
        record.created_at = now;
        conn.execute(
            "INSERT INTO test_case_runs
                (id, workspace_id, case_id, device_id, instruction, result, summary,
                 started_at, finished_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                record.id,
                workspace_id,
                record.case_id,
                record.device_id,
                record.instruction,
                record.result,
                record.summary,
                record.started_at,
                record.finished_at,
                record.created_at
            ],
        )
        .map_err(db_err)?;
        Ok(record)
    }

    /// 追加一条执行过程步骤（id 为空则生成；ts 缺省取当前时间）。
    pub fn append_run_step(
        conn: &Connection,
        mut step: TestCaseRunStepRecord,
    ) -> Result<TestCaseRunStepRecord, String> {
        if step.run_id.trim().is_empty() {
            return Err("执行步骤缺少关联 run id".to_string());
        }
        if step.id.trim().is_empty() {
            step.id = Uuid::new_v4().to_string();
        }
        if step.ts == 0 {
            step.ts = now_millis();
        }
        conn.execute(
            "INSERT INTO test_case_run_steps
                (id, run_id, step_no, observation, screenshot_path, ts)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                step.id,
                step.run_id,
                step.step_no,
                step.observation,
                step.screenshot_path,
                step.ts
            ],
        )
        .map_err(db_err)?;
        Ok(step)
    }

    /// 完成一次执行：回写判定结果、结论摘要与结束时间。
    pub fn complete_run(
        conn: &Connection,
        run_id: &str,
        result: &str,
        summary: &str,
        finished_at: i64,
    ) -> Result<(), String> {
        conn.execute(
            "UPDATE test_case_runs SET result = ?1, summary = ?2, finished_at = ?3 WHERE id = ?4",
            params![result, summary, finished_at, run_id],
        )
        .map_err(db_err)?;
        Ok(())
    }

    /// 列出某条用例的全部执行记录（按开始时间倒序，含过程步骤）。
    pub fn list_runs(
        conn: &Connection,
        workspace_id: &str,
        case_id: &str,
    ) -> Result<Vec<TestCaseRunRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, case_id, device_id, instruction, result, summary,
                        started_at, finished_at, created_at
                 FROM test_case_runs
                 WHERE workspace_id = ?1 AND case_id = ?2
                 ORDER BY started_at DESC",
            )
            .map_err(db_err)?;
        let mut runs = stmt
            .query_map(params![workspace_id, case_id], row_to_run)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        for run in runs.iter_mut() {
            run.steps = Self::list_run_steps(conn, &run.id)?;
        }
        Ok(runs)
    }

    /// 按 id 读取单条执行记录（含过程步骤）。
    pub fn read_run(
        conn: &Connection,
        run_id: &str,
    ) -> Result<Option<TestCaseRunRecord>, String> {
        let run = conn
            .query_row(
                "SELECT id, case_id, device_id, instruction, result, summary,
                        started_at, finished_at, created_at
                 FROM test_case_runs WHERE id = ?1",
                params![run_id],
                row_to_run,
            )
            .optional()
            .map_err(db_err)?;
        match run {
            Some(mut run) => {
                run.steps = Self::list_run_steps(conn, &run.id)?;
                Ok(Some(run))
            }
            None => Ok(None),
        }
    }

    fn list_run_steps(
        conn: &Connection,
        run_id: &str,
    ) -> Result<Vec<TestCaseRunStepRecord>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, run_id, step_no, observation, screenshot_path, ts
                 FROM test_case_run_steps
                 WHERE run_id = ?1
                 ORDER BY step_no ASC, ts ASC",
            )
            .map_err(db_err)?;
        let rows = stmt
            .query_map(params![run_id], row_to_run_step)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        Ok(rows)
    }
}

fn row_to_module(row: &Row<'_>) -> Result<TestCaseModuleRecord, rusqlite::Error> {
    Ok(TestCaseModuleRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        parent_id: row.get(2)?,
        order_index: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn row_to_run(row: &Row<'_>) -> Result<TestCaseRunRecord, rusqlite::Error> {
    Ok(TestCaseRunRecord {
        id: row.get(0)?,
        case_id: row.get(1)?,
        device_id: row.get(2)?,
        instruction: row.get(3)?,
        result: row.get(4)?,
        summary: row.get(5)?,
        started_at: row.get(6)?,
        finished_at: row.get(7)?,
        created_at: row.get(8)?,
        steps: Vec::new(),
    })
}

fn row_to_run_step(row: &Row<'_>) -> Result<TestCaseRunStepRecord, rusqlite::Error> {
    Ok(TestCaseRunStepRecord {
        id: row.get(0)?,
        run_id: row.get(1)?,
        step_no: row.get(2)?,
        observation: row.get(3)?,
        screenshot_path: row.get(4)?,
        ts: row.get(5)?,
    })
}

fn row_to_case(row: &Row<'_>) -> Result<TestCaseRecord, rusqlite::Error> {
    Ok(TestCaseRecord {
        id: row.get(0)?,
        case_id: row.get(1)?,
        title: row.get(2)?,
        module_id: row.get(3)?,
        priority: row.get(4)?,
        case_type: row.get(5)?,
        status: row.get(6)?,
        source: row.get(7)?,
        precondition: row.get(8)?,
        steps_json: row.get(9)?,
        assertions_json: row.get(10)?,
        tags_json: row.get(11)?,
        exec_result: row.get(12)?,
        remark: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::schema;

    const WS: &str = "ws-test";

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        schema::create_tables(&conn).expect("create tables");
        conn
    }

    fn sample_case(case_id: &str, title: &str) -> TestCaseRecord {
        TestCaseRecord {
            id: String::new(),
            case_id: case_id.to_string(),
            title: title.to_string(),
            module_id: None,
            priority: "P1".to_string(),
            case_type: "功能".to_string(),
            status: "草稿".to_string(),
            source: "手工".to_string(),
            precondition: String::new(),
            steps_json: "[]".to_string(),
            assertions_json: "[]".to_string(),
            tags_json: "[]".to_string(),
            exec_result: "未执行".to_string(),
            remark: String::new(),
            created_at: 0,
            updated_at: 0,
        }
    }

    fn sample_module(name: &str) -> TestCaseModuleRecord {
        TestCaseModuleRecord {
            id: String::new(),
            name: name.to_string(),
            parent_id: None,
            order_index: 0,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn module_upsert_list_and_delete() {
        let conn = setup();
        let saved = TestCaseDao::save_module(&conn, WS, sample_module("登录")).unwrap();
        assert!(!saved.id.is_empty());

        let listed = TestCaseDao::list_modules(&conn, WS).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].name, "登录");

        // 更新同 id 不新增
        let mut update = saved.clone();
        update.name = "登录模块".to_string();
        let updated = TestCaseDao::save_module(&conn, WS, update).unwrap();
        assert_eq!(updated.id, saved.id);
        assert_eq!(TestCaseDao::list_modules(&conn, WS).unwrap().len(), 1);
        assert_eq!(updated.created_at, saved.created_at);

        // 空模块可删
        assert!(TestCaseDao::delete_module(&conn, WS, &saved.id).unwrap());
        assert_eq!(TestCaseDao::list_modules(&conn, WS).unwrap().len(), 0);
    }

    #[test]
    fn delete_non_empty_module_is_rejected() {
        let conn = setup();
        let module = TestCaseDao::save_module(&conn, WS, sample_module("支付")).unwrap();

        // 含用例 → 拒删
        let mut case = sample_case("TC-PAY-001", "支付成功");
        case.module_id = Some(module.id.clone());
        TestCaseDao::save_case(&conn, WS, case).unwrap();
        assert!(TestCaseDao::delete_module(&conn, WS, &module.id).is_err());

        // 含子模块 → 拒删
        let conn2 = setup();
        let parent = TestCaseDao::save_module(&conn2, WS, sample_module("父")).unwrap();
        let mut child = sample_module("子");
        child.parent_id = Some(parent.id.clone());
        TestCaseDao::save_module(&conn2, WS, child).unwrap();
        assert!(TestCaseDao::delete_module(&conn2, WS, &parent.id).is_err());
    }

    #[test]
    fn case_upsert_list_read_and_delete() {
        let conn = setup();
        let saved = TestCaseDao::save_case(&conn, WS, sample_case("TC-LOGIN-001", "登录成功")).unwrap();
        assert!(!saved.id.is_empty());

        let listed = TestCaseDao::list_cases(&conn, WS, None).unwrap();
        assert_eq!(listed.len(), 1);

        let read = TestCaseDao::read_case(&conn, &saved.id).unwrap().unwrap();
        assert_eq!(read.title, "登录成功");

        // 更新标题，按 id 不新增
        let mut update = saved.clone();
        update.title = "登录成功（改）".to_string();
        let updated = TestCaseDao::save_case(&conn, WS, update).unwrap();
        assert_eq!(updated.id, saved.id);
        assert_eq!(TestCaseDao::list_cases(&conn, WS, None).unwrap().len(), 1);

        let deleted = TestCaseDao::delete_cases(&conn, &[saved.id.clone()]).unwrap();
        assert_eq!(deleted, 1);
        assert_eq!(TestCaseDao::list_cases(&conn, WS, None).unwrap().len(), 0);
    }

    #[test]
    fn assertions_json_round_trips() {
        let conn = setup();
        let mut case = sample_case("TC-ASSERT-001", "断言往返");
        case.assertions_json = r#"["首页展示欢迎语","点赞数为 1"]"#.to_string();
        let saved = TestCaseDao::save_case(&conn, WS, case).unwrap();
        let read = TestCaseDao::read_case(&conn, &saved.id).unwrap().unwrap();
        assert_eq!(read.assertions_json, r#"["首页展示欢迎语","点赞数为 1"]"#);
    }

    #[test]
    fn duplicate_case_id_in_same_workspace_is_rejected() {
        let conn = setup();
        TestCaseDao::save_case(&conn, WS, sample_case("TC-DUP-001", "甲")).unwrap();
        let err = TestCaseDao::save_case(&conn, WS, sample_case("TC-DUP-001", "乙"));
        assert!(err.is_err());

        // 不同工作区不冲突
        TestCaseDao::save_case(&conn, "ws-other", sample_case("TC-DUP-001", "丙")).unwrap();
    }

    #[test]
    fn empty_title_or_case_id_is_rejected() {
        let conn = setup();
        assert!(TestCaseDao::save_case(&conn, WS, sample_case("TC-X-001", "  ")).is_err());
        assert!(TestCaseDao::save_case(&conn, WS, sample_case("  ", "标题")).is_err());
    }

    fn sample_run(case_id: &str) -> TestCaseRunRecord {
        TestCaseRunRecord {
            id: String::new(),
            case_id: case_id.to_string(),
            device_id: "device-1".to_string(),
            instruction: "请完成登录".to_string(),
            result: "阻塞".to_string(),
            summary: String::new(),
            started_at: 0,
            finished_at: None,
            created_at: 0,
            steps: Vec::new(),
        }
    }

    #[test]
    fn run_start_step_complete_and_read_round_trips() {
        let conn = setup();
        let case = TestCaseDao::save_case(&conn, WS, sample_case("TC-RUN-001", "登录")).unwrap();

        // 开始执行
        let run = TestCaseDao::start_run(&conn, WS, sample_run(&case.id)).unwrap();
        assert!(!run.id.is_empty());
        assert!(run.started_at > 0);
        assert!(run.finished_at.is_none());

        // 追加两步过程观察
        TestCaseDao::append_run_step(
            &conn,
            TestCaseRunStepRecord {
                id: String::new(),
                run_id: run.id.clone(),
                step_no: 1,
                observation: "已点击登录".to_string(),
                screenshot_path: "/tmp/1.png".to_string(),
                ts: 0,
            },
        )
        .unwrap();
        TestCaseDao::append_run_step(
            &conn,
            TestCaseRunStepRecord {
                id: String::new(),
                run_id: run.id.clone(),
                step_no: 2,
                observation: "进入首页".to_string(),
                screenshot_path: String::new(),
                ts: 0,
            },
        )
        .unwrap();

        // 完成执行回写判定
        TestCaseDao::complete_run(&conn, &run.id, "通过", "全部断言满足", 123).unwrap();

        // 读取往返：结果、摘要、结束时间、过程步骤齐全
        let read = TestCaseDao::read_run(&conn, &run.id).unwrap().unwrap();
        assert_eq!(read.result, "通过");
        assert_eq!(read.summary, "全部断言满足");
        assert_eq!(read.finished_at, Some(123));
        assert_eq!(read.steps.len(), 2);
        assert_eq!(read.steps[0].observation, "已点击登录");
        assert_eq!(read.steps[0].screenshot_path, "/tmp/1.png");
        assert_eq!(read.steps[1].step_no, 2);

        // 列表按用例聚合
        let runs = TestCaseDao::list_runs(&conn, WS, &case.id).unwrap();
        assert_eq!(runs.len(), 1);
        assert_eq!(runs[0].steps.len(), 2);
    }
}
