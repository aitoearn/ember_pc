use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait PerfMonitorAppDataSource: Send + Sync {
    async fn save_perf_monitor_session(
        &self,
        _params: PerfMonitorSessionSaveParams,
    ) -> Result<PerfMonitorSessionSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/perf/monitor/session"))
    }

    async fn list_perf_monitor_sessions(
        &self,
        _params: PerfMonitorSessionListParams,
    ) -> Result<PerfMonitorSessionListResponse, RuntimeCoreError> {
        Err(unavailable("list/perf/monitor/sessions"))
    }

    async fn read_perf_monitor_session(
        &self,
        _params: PerfMonitorSessionReadParams,
    ) -> Result<PerfMonitorSessionReadResponse, RuntimeCoreError> {
        Err(unavailable("read/perf/monitor/session"))
    }
}

impl PerfMonitorAppDataSource for NoopAppDataSource {}
