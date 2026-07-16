//! 工作区探索压测配置 DAO（单表 JSON 快照）。

use rusqlite::{params, Connection, OptionalExtension};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceExploreProfileRecord {
    pub workspace_id: String,
    pub rules_json: String,
    pub config_json: String,
    pub updated_at: String,
}

pub struct DeviceExploreDao;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn db_err(error: impl std::fmt::Display) -> String {
    format!("探索压测配置数据库操作失败: {error}")
}

impl DeviceExploreDao {
    pub fn read(conn: &Connection, workspace_id: &str) -> Result<Option<DeviceExploreProfileRecord>, String> {
        conn.query_row(
            "SELECT workspace_id, rules_json, config_json, updated_at
             FROM device_explore_profiles WHERE workspace_id = ?1",
            params![workspace_id],
            |row| {
                Ok(DeviceExploreProfileRecord {
                    workspace_id: row.get(0)?,
                    rules_json: row.get(1)?,
                    config_json: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|e| db_err(e))
    }

    pub fn save(
        conn: &Connection,
        workspace_id: &str,
        rules_json: &str,
        config_json: &str,
    ) -> Result<DeviceExploreProfileRecord, String> {
        let updated_at = now_iso();
        let exists = conn
            .query_row(
                "SELECT 1 FROM device_explore_profiles WHERE workspace_id = ?1",
                params![workspace_id],
                |_| Ok(()),
            )
            .optional()
            .map_err(|e| db_err(e))?
            .is_some();

        if exists {
            conn.execute(
                "UPDATE device_explore_profiles
                 SET rules_json = ?2, config_json = ?3, updated_at = ?4
                 WHERE workspace_id = ?1",
                params![workspace_id, rules_json, config_json, updated_at],
            )
            .map_err(|e| db_err(e))?;
        } else {
            conn.execute(
                "INSERT INTO device_explore_profiles
                 (workspace_id, rules_json, config_json, updated_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![workspace_id, rules_json, config_json, updated_at],
            )
            .map_err(|e| db_err(e))?;
        }

        Ok(DeviceExploreProfileRecord {
            workspace_id: workspace_id.to_string(),
            rules_json: rules_json.to_string(),
            config_json: config_json.to_string(),
            updated_at,
        })
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
    fn round_trip_profile() {
        let conn = setup();
        let saved = DeviceExploreDao::save(
            &conn,
            "ws-1",
            r#"[{"id":"r1","name":"demo"}]"#,
            r#"{"blockWidgetXpaths":[]}"#,
        )
        .expect("save");
        assert_eq!(saved.workspace_id, "ws-1");
        let read = DeviceExploreDao::read(&conn, "ws-1").expect("read");
        assert!(read.is_some());
    }
}
