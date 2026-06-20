//! 确定性可复现测试流与自愈回放：protocol ↔ core DAO 映射。
//!
//! 在协议边界完成 JSON 列（steps / locators / assertResult）与协议结构的互转。
//! 时间戳在 DAO 层已是 RFC3339 字符串，无需额外换算。

use super::data_error;
use crate::RuntimeCoreError;
use app_server_protocol::{
    DeviceFlowDeleteParams, DeviceFlowDeleteResponse, DeviceFlowHealingListParams,
    DeviceFlowHealingListResponse, DeviceFlowHealingResolveParams, DeviceFlowHealingResolveResponse,
    DeviceFlowHealingSaveParams, DeviceFlowHealingSaveResponse, DeviceFlowListParams,
    DeviceFlowListResponse, DeviceFlowReadParams, DeviceFlowReadResponse, DeviceFlowRunListParams,
    DeviceFlowRunListResponse, DeviceFlowRunReadParams, DeviceFlowRunReadResponse,
    DeviceFlowRunSaveParams, DeviceFlowRunSaveResponse, DeviceFlowSaveParams, DeviceFlowSaveResponse,
    FlowAssertResult, FlowLocator, FlowLocatorRef, FlowRun, FlowRunStep, FlowStep, HealingRevision,
    TestFlow,
};
use ember_core::database;
use ember_core::database::dao::device_flow_dao::{
    DeviceFlowDao, DeviceFlowHealingRevisionRecord, DeviceFlowRecord, DeviceFlowRunRecord,
    DeviceFlowRunStepRecord,
};
use ember_core::database::DbConnection;

// ----------------------------------------------------------------------------
// 流映射
// ----------------------------------------------------------------------------

fn flow_record_to_protocol(record: DeviceFlowRecord) -> TestFlow {
    let steps: Vec<FlowStep> = serde_json::from_str(&record.steps_json).unwrap_or_default();
    TestFlow {
        id: record.id,
        workspace_id: record.workspace_id,
        name: record.name,
        app_package: record.app_package,
        platform: record.platform,
        format_version: record.format_version,
        source: record.source,
        self_healing_enabled: record.self_healing_enabled,
        steps,
        created_at: record.created_at,
        updated_at: record.updated_at,
    }
}

fn protocol_flow_to_record(flow: TestFlow) -> Result<DeviceFlowRecord, RuntimeCoreError> {
    let steps_json = serde_json::to_string(&flow.steps).map_err(data_error)?;
    Ok(DeviceFlowRecord {
        id: flow.id,
        workspace_id: flow.workspace_id,
        name: flow.name,
        app_package: flow.app_package,
        platform: if flow.platform.trim().is_empty() {
            "android".to_string()
        } else {
            flow.platform
        },
        format_version: if flow.format_version <= 0 {
            1
        } else {
            flow.format_version
        },
        source: if flow.source.trim().is_empty() {
            "vlm_recorded".to_string()
        } else {
            flow.source
        },
        self_healing_enabled: flow.self_healing_enabled,
        steps_json,
        created_at: String::new(),
        updated_at: String::new(),
    })
}

pub(crate) fn list_device_flows(
    db: &DbConnection,
    params: DeviceFlowListParams,
) -> Result<DeviceFlowListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records = DeviceFlowDao::list_flows(&conn, &params.workspace_id).map_err(data_error)?;
    Ok(DeviceFlowListResponse {
        flows: records.into_iter().map(flow_record_to_protocol).collect(),
    })
}

pub(crate) fn read_device_flow(
    db: &DbConnection,
    params: DeviceFlowReadParams,
) -> Result<DeviceFlowReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let flow = DeviceFlowDao::read_flow(&conn, &params.id)
        .map_err(data_error)?
        .map(flow_record_to_protocol);
    Ok(DeviceFlowReadResponse { flow })
}

pub(crate) fn save_device_flow(
    db: &DbConnection,
    params: DeviceFlowSaveParams,
) -> Result<DeviceFlowSaveResponse, RuntimeCoreError> {
    let workspace_id = params.flow.workspace_id.clone();
    let record = protocol_flow_to_record(params.flow)?;
    let conn = database::lock_db(db).map_err(data_error)?;
    let saved = DeviceFlowDao::save_flow(&conn, &workspace_id, record).map_err(data_error)?;
    Ok(DeviceFlowSaveResponse {
        flow: flow_record_to_protocol(saved),
    })
}

pub(crate) fn delete_device_flows(
    db: &DbConnection,
    params: DeviceFlowDeleteParams,
) -> Result<DeviceFlowDeleteResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let deleted = DeviceFlowDao::delete_flows(&conn, &params.ids).map_err(data_error)?;
    Ok(DeviceFlowDeleteResponse { deleted })
}

// ----------------------------------------------------------------------------
// 回放记录映射
// ----------------------------------------------------------------------------

fn run_record_to_protocol(record: DeviceFlowRunRecord) -> FlowRun {
    FlowRun {
        id: record.id,
        flow_id: record.flow_id,
        workspace_id: record.workspace_id,
        device_id: record.device_id,
        started_at: record.started_at,
        finished_at: record.finished_at,
        conclusion: record.conclusion,
        healing_triggered: record.healing_triggered,
        llm_token_used: record.llm_token_used,
        summary: record.summary,
    }
}

fn run_step_record_to_protocol(record: DeviceFlowRunStepRecord) -> FlowRunStep {
    let locator_used = record
        .locator_used_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<FlowLocatorRef>(raw).ok());
    let assert_result = record
        .assert_result_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<FlowAssertResult>(raw).ok());
    FlowRunStep {
        run_id: record.run_id,
        index: record.idx.max(0) as u32,
        op: record.op,
        locator_used,
        status: record.status,
        assert_result,
        screenshot_path: record.screenshot_path,
        duration_ms: record.duration_ms,
    }
}

fn protocol_run_step_to_record(
    step: &FlowRunStep,
) -> Result<DeviceFlowRunStepRecord, RuntimeCoreError> {
    let locator_used_json = match &step.locator_used {
        Some(locator) => Some(serde_json::to_string(locator).map_err(data_error)?),
        None => None,
    };
    let assert_result_json = match &step.assert_result {
        Some(result) => Some(serde_json::to_string(result).map_err(data_error)?),
        None => None,
    };
    Ok(DeviceFlowRunStepRecord {
        run_id: step.run_id.clone(),
        idx: step.index as i64,
        op: step.op.clone(),
        locator_used_json,
        status: step.status.clone(),
        assert_result_json,
        screenshot_path: step.screenshot_path.clone(),
        duration_ms: step.duration_ms,
    })
}

pub(crate) fn save_device_flow_run(
    db: &DbConnection,
    params: DeviceFlowRunSaveParams,
) -> Result<DeviceFlowRunSaveResponse, RuntimeCoreError> {
    let run = params.run;
    let run_record = DeviceFlowRunRecord {
        id: run.id,
        flow_id: run.flow_id,
        workspace_id: run.workspace_id,
        device_id: run.device_id,
        started_at: run.started_at,
        finished_at: run.finished_at,
        conclusion: if run.conclusion.trim().is_empty() {
            "blocked".to_string()
        } else {
            run.conclusion
        },
        healing_triggered: run.healing_triggered,
        llm_token_used: run.llm_token_used,
        summary: run.summary,
    };
    let steps = params
        .steps
        .iter()
        .map(protocol_run_step_to_record)
        .collect::<Result<Vec<_>, _>>()?;

    let conn = database::lock_db(db).map_err(data_error)?;
    let run_id = DeviceFlowDao::save_run(&conn, run_record, &steps).map_err(data_error)?;
    Ok(DeviceFlowRunSaveResponse { run_id })
}

pub(crate) fn list_device_flow_runs(
    db: &DbConnection,
    params: DeviceFlowRunListParams,
) -> Result<DeviceFlowRunListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records = DeviceFlowDao::list_runs(&conn, &params.flow_id, params.limit, params.offset)
        .map_err(data_error)?;
    Ok(DeviceFlowRunListResponse {
        runs: records.into_iter().map(run_record_to_protocol).collect(),
    })
}

pub(crate) fn read_device_flow_run(
    db: &DbConnection,
    params: DeviceFlowRunReadParams,
) -> Result<DeviceFlowRunReadResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    match DeviceFlowDao::read_run(&conn, &params.run_id).map_err(data_error)? {
        Some((run, steps)) => Ok(DeviceFlowRunReadResponse {
            run: Some(run_record_to_protocol(run)),
            steps: steps.into_iter().map(run_step_record_to_protocol).collect(),
        }),
        None => Ok(DeviceFlowRunReadResponse::default()),
    }
}

// ----------------------------------------------------------------------------
// 自愈修订映射
// ----------------------------------------------------------------------------

fn healing_record_to_protocol(record: DeviceFlowHealingRevisionRecord) -> HealingRevision {
    let original_locators: Vec<FlowLocator> =
        serde_json::from_str(&record.original_locators_json).unwrap_or_default();
    let healed_locator: FlowLocator =
        serde_json::from_str(&record.healed_locator_json).unwrap_or_default();
    HealingRevision {
        id: record.id,
        flow_id: record.flow_id,
        step_index: record.step_index.max(0) as u32,
        run_id: record.run_id,
        original_locators,
        healed_locator,
        evidence_screenshot_path: record.evidence_screenshot_path,
        status: record.status,
        created_at: record.created_at,
    }
}

pub(crate) fn list_device_flow_healing(
    db: &DbConnection,
    params: DeviceFlowHealingListParams,
) -> Result<DeviceFlowHealingListResponse, RuntimeCoreError> {
    let conn = database::lock_db(db).map_err(data_error)?;
    let records =
        DeviceFlowDao::list_healing(&conn, &params.flow_id, params.status.as_deref())
            .map_err(data_error)?;
    Ok(DeviceFlowHealingListResponse {
        revisions: records.into_iter().map(healing_record_to_protocol).collect(),
    })
}

pub(crate) fn save_device_flow_healing(
    db: &DbConnection,
    params: DeviceFlowHealingSaveParams,
) -> Result<DeviceFlowHealingSaveResponse, RuntimeCoreError> {
    let revision = params.revision;
    let record = DeviceFlowHealingRevisionRecord {
        id: revision.id,
        flow_id: revision.flow_id,
        step_index: revision.step_index as i64,
        run_id: revision.run_id,
        original_locators_json: serde_json::to_string(&revision.original_locators)
            .map_err(data_error)?,
        healed_locator_json: serde_json::to_string(&revision.healed_locator).map_err(data_error)?,
        evidence_screenshot_path: revision.evidence_screenshot_path,
        status: revision.status,
        created_at: String::new(),
    };
    let conn = database::lock_db(db).map_err(data_error)?;
    let saved = DeviceFlowDao::save_healing(&conn, record).map_err(data_error)?;
    Ok(DeviceFlowHealingSaveResponse { id: saved.id })
}

pub(crate) fn resolve_device_flow_healing(
    db: &DbConnection,
    params: DeviceFlowHealingResolveParams,
) -> Result<DeviceFlowHealingResolveResponse, RuntimeCoreError> {
    let resolution = params.resolution.trim();
    if resolution != "accepted" && resolution != "flagged_defect" {
        return Err(RuntimeCoreError::Backend(format!(
            "非法的自愈处置 resolution: {resolution}"
        )));
    }

    let conn = database::lock_db(db).map_err(data_error)?;
    let revision = DeviceFlowDao::get_healing(&conn, &params.id)
        .map_err(data_error)?
        .ok_or_else(|| RuntimeCoreError::Backend("自愈修订不存在".to_string()))?;

    let mut updated_flow: Option<TestFlow> = None;

    if resolution == "accepted" {
        // 把 healedLocator 并入对应流步骤 locators 顶部
        if let Some(flow_record) =
            DeviceFlowDao::read_flow(&conn, &revision.flow_id).map_err(data_error)?
        {
            let workspace_id = flow_record.workspace_id.clone();
            let mut flow = flow_record_to_protocol(flow_record);
            let healed: FlowLocator =
                serde_json::from_str(&revision.healed_locator_json).map_err(data_error)?;
            let step_index = revision.step_index.max(0) as usize;
            if let Some(step) = flow.steps.get_mut(step_index) {
                let mut locators = step.locators.take().unwrap_or_default();
                locators.insert(0, healed);
                step.locators = Some(locators);
            }
            let record = protocol_flow_to_record(flow)?;
            let saved =
                DeviceFlowDao::save_flow(&conn, &workspace_id, record).map_err(data_error)?;
            updated_flow = Some(flow_record_to_protocol(saved));
        }
    }

    DeviceFlowDao::update_healing_status(&conn, &params.id, resolution).map_err(data_error)?;

    let mut revision = healing_record_to_protocol(revision);
    revision.status = resolution.to_string();
    Ok(DeviceFlowHealingResolveResponse {
        revision,
        flow: updated_flow,
    })
}

#[cfg(test)]
mod tests {
    //! local_data_source 层集成测试：protocol ↔ DAO 端到端往返。
    //!
    //! 覆盖 deviceFlow save→read→list→delete、deviceFlowRun save/read、
    //! deviceFlowHealing save/resolve（accepted 并入定位 / flagged_defect 保留原流）。
    //! 在真实临时 SQLite 上驱动，验证协议边界的 JSON 列互转与自愈处置业务逻辑。
    use super::*;
    use app_server_protocol::FlowWaitPolicy;
    use ember_core::database::schema;
    use rusqlite::Connection;
    use std::sync::{Arc, Mutex};

    const WORKSPACE_ID: &str = "ws-flow-test";

    fn setup_db() -> DbConnection {
        let conn = Connection::open_in_memory().expect("打开内存数据库");
        schema::create_tables(&conn).expect("建表");
        Arc::new(Mutex::new(conn))
    }

    fn sample_flow() -> TestFlow {
        TestFlow {
            id: String::new(),
            workspace_id: WORKSPACE_ID.to_string(),
            name: "登录回归流".to_string(),
            app_package: "com.example.app".to_string(),
            platform: "android".to_string(),
            format_version: 1,
            source: "vlm_recorded".to_string(),
            self_healing_enabled: true,
            steps: vec![
                FlowStep {
                    index: 0,
                    op: "tap".to_string(),
                    locators: Some(vec![FlowLocator {
                        kind: "resource_id".to_string(),
                        value: "com.example:id/login".to_string(),
                        text_match: None,
                        vlm_anchor: None,
                    }]),
                    args: None,
                    assert: None,
                    wait: None,
                    intent: Some("点击登录按钮".to_string()),
                },
                FlowStep {
                    index: 1,
                    op: "input".to_string(),
                    locators: Some(vec![FlowLocator {
                        kind: "text".to_string(),
                        value: "用户名".to_string(),
                        text_match: Some("contains".to_string()),
                        vlm_anchor: None,
                    }]),
                    args: Some(serde_json::json!({ "text": "alice" })),
                    assert: None,
                    wait: Some(FlowWaitPolicy {
                        stabilize_ms: 300,
                        timeout_ms: 5000,
                    }),
                    intent: Some("输入用户名".to_string()),
                },
            ],
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn flow_save_read_list_delete_round_trip() {
        let db = setup_db();
        let saved = save_device_flow(
            &db,
            DeviceFlowSaveParams {
                flow: sample_flow(),
            },
        )
        .expect("保存流")
        .flow;
        assert!(!saved.id.is_empty(), "保存后应回填 id");
        assert!(!saved.created_at.is_empty(), "保存后应回填 created_at");
        assert_eq!(saved.steps.len(), 2, "步骤应完整往返");

        let read = read_device_flow(
            &db,
            DeviceFlowReadParams {
                id: saved.id.clone(),
            },
        )
        .expect("读取流")
        .flow
        .expect("流应存在");
        assert_eq!(read.name, "登录回归流");
        assert_eq!(read.steps[1].op, "input");
        assert_eq!(
            read.steps[1].args,
            Some(serde_json::json!({ "text": "alice" })),
            "args 应保真往返"
        );

        let listed = list_device_flows(
            &db,
            DeviceFlowListParams {
                workspace_id: WORKSPACE_ID.to_string(),
            },
        )
        .expect("列出流")
        .flows;
        assert_eq!(listed.len(), 1);

        let deleted = delete_device_flows(
            &db,
            DeviceFlowDeleteParams {
                ids: vec![saved.id.clone()],
            },
        )
        .expect("删除流")
        .deleted;
        assert_eq!(deleted, 1);

        let after = read_device_flow(&db, DeviceFlowReadParams { id: saved.id })
            .expect("删除后读取")
            .flow;
        assert!(after.is_none(), "删除后流应不存在");
    }

    #[test]
    fn run_save_and_read_round_trip() {
        let db = setup_db();
        let flow = save_device_flow(
            &db,
            DeviceFlowSaveParams {
                flow: sample_flow(),
            },
        )
        .expect("保存流")
        .flow;

        let run = FlowRun {
            id: "run-1".to_string(),
            flow_id: flow.id.clone(),
            workspace_id: WORKSPACE_ID.to_string(),
            device_id: "emulator-5554".to_string(),
            started_at: "2026-06-17T10:00:00Z".to_string(),
            finished_at: Some("2026-06-17T10:00:05Z".to_string()),
            conclusion: "passed".to_string(),
            healing_triggered: false,
            llm_token_used: 0,
            summary: "全部通过".to_string(),
        };
        let steps = vec![FlowRunStep {
            run_id: "run-1".to_string(),
            index: 0,
            op: "tap".to_string(),
            locator_used: Some(FlowLocatorRef {
                kind: "resource_id".to_string(),
                value: "com.example:id/login".to_string(),
            }),
            status: "passed".to_string(),
            assert_result: Some(FlowAssertResult {
                ok: true,
                reason: None,
            }),
            screenshot_path: Some("/tmp/step0.png".to_string()),
            duration_ms: 120,
        }];

        let run_id = save_device_flow_run(&db, DeviceFlowRunSaveParams { run, steps })
            .expect("保存回放")
            .run_id;
        assert_eq!(run_id, "run-1");

        let read = read_device_flow_run(
            &db,
            DeviceFlowRunReadParams {
                run_id: "run-1".to_string(),
            },
        )
        .expect("读取回放");
        let read_run = read.run.expect("回放应存在");
        assert_eq!(read_run.conclusion, "passed");
        assert_eq!(read_run.llm_token_used, 0, "纯确定性回放 token=0");
        assert_eq!(read.steps.len(), 1);
        assert_eq!(
            read.steps[0].locator_used.as_ref().map(|l| l.kind.as_str()),
            Some("resource_id"),
            "locatorUsed 应保真往返"
        );

        let listed = list_device_flow_runs(
            &db,
            DeviceFlowRunListParams {
                flow_id: flow.id,
                limit: None,
                offset: None,
            },
        )
        .expect("列出回放")
        .runs;
        assert_eq!(listed.len(), 1);
    }

    #[test]
    fn healing_resolve_accepted_merges_locator_into_step() {
        let db = setup_db();
        let flow = save_device_flow(
            &db,
            DeviceFlowSaveParams {
                flow: sample_flow(),
            },
        )
        .expect("保存流")
        .flow;

        let healed = FlowLocator {
            kind: "accessibility_id".to_string(),
            value: "login-btn".to_string(),
            text_match: None,
            vlm_anchor: None,
        };
        let revision = HealingRevision {
            id: String::new(),
            flow_id: flow.id.clone(),
            step_index: 0,
            run_id: "run-1".to_string(),
            original_locators: flow.steps[0].locators.clone().unwrap_or_default(),
            healed_locator: healed.clone(),
            evidence_screenshot_path: Some("/tmp/heal0.png".to_string()),
            status: "pending".to_string(),
            created_at: String::new(),
        };
        let revision_id = save_device_flow_healing(&db, DeviceFlowHealingSaveParams { revision })
            .expect("保存修订")
            .id;
        assert!(!revision_id.is_empty());

        let pending = list_device_flow_healing(
            &db,
            DeviceFlowHealingListParams {
                flow_id: flow.id.clone(),
                status: Some("pending".to_string()),
            },
        )
        .expect("列出待确认修订")
        .revisions;
        assert_eq!(pending.len(), 1);

        let resolved = resolve_device_flow_healing(
            &db,
            DeviceFlowHealingResolveParams {
                id: revision_id.clone(),
                resolution: "accepted".to_string(),
            },
        )
        .expect("接受修订");
        assert_eq!(resolved.revision.status, "accepted");
        let updated_flow = resolved.flow.expect("accepted 应回传新流");
        let merged = updated_flow.steps[0]
            .locators
            .as_ref()
            .expect("步骤应有定位");
        assert_eq!(
            merged.first().map(|l| l.kind.as_str()),
            Some("accessibility_id"),
            "healedLocator 应并入 locators 顶部"
        );
        assert_eq!(merged.len(), 2, "原定位应保留在后"); 

        let remaining_pending = list_device_flow_healing(
            &db,
            DeviceFlowHealingListParams {
                flow_id: flow.id,
                status: Some("pending".to_string()),
            },
        )
        .expect("再次列出待确认")
        .revisions;
        assert!(remaining_pending.is_empty(), "处置后不应再 pending");
    }

    #[test]
    fn healing_resolve_flagged_defect_keeps_flow() {
        let db = setup_db();
        let flow = save_device_flow(
            &db,
            DeviceFlowSaveParams {
                flow: sample_flow(),
            },
        )
        .expect("保存流")
        .flow;
        let revision = HealingRevision {
            id: String::new(),
            flow_id: flow.id.clone(),
            step_index: 0,
            run_id: "run-2".to_string(),
            original_locators: flow.steps[0].locators.clone().unwrap_or_default(),
            healed_locator: FlowLocator {
                kind: "text".to_string(),
                value: "登录".to_string(),
                text_match: None,
                vlm_anchor: None,
            },
            evidence_screenshot_path: None,
            status: "pending".to_string(),
            created_at: String::new(),
        };
        let revision_id = save_device_flow_healing(&db, DeviceFlowHealingSaveParams { revision })
            .expect("保存修订")
            .id;

        let resolved = resolve_device_flow_healing(
            &db,
            DeviceFlowHealingResolveParams {
                id: revision_id,
                resolution: "flagged_defect".to_string(),
            },
        )
        .expect("标记缺陷");
        assert_eq!(resolved.revision.status, "flagged_defect");
        assert!(resolved.flow.is_none(), "flagged_defect 不应回传新流");

        let unchanged = read_device_flow(&db, DeviceFlowReadParams { id: flow.id })
            .expect("读取流")
            .flow
            .expect("流仍在");
        assert_eq!(
            unchanged.steps[0]
                .locators
                .as_ref()
                .map(|l| l.len()),
            Some(1),
            "原流定位不应被改动"
        );
    }

    #[test]
    fn resolve_rejects_invalid_resolution() {
        let db = setup_db();
        let err = resolve_device_flow_healing(
            &db,
            DeviceFlowHealingResolveParams {
                id: "missing".to_string(),
                resolution: "bogus".to_string(),
            },
        );
        assert!(err.is_err(), "非法 resolution 应报错");
    }
}
