use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
    pub async fn save_perf_monitor_session(
        &self,
        params: PerfMonitorSessionSaveParams,
    ) -> Result<PerfMonitorSessionSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_perf_monitor_session(params).await
    }

    pub async fn list_perf_monitor_sessions(
        &self,
        params: PerfMonitorSessionListParams,
    ) -> Result<PerfMonitorSessionListResponse, RuntimeCoreError> {
        self.app_data_source.list_perf_monitor_sessions(params).await
    }

    pub async fn read_perf_monitor_session(
        &self,
        params: PerfMonitorSessionReadParams,
    ) -> Result<PerfMonitorSessionReadResponse, RuntimeCoreError> {
        self.app_data_source.read_perf_monitor_session(params).await
    }
}
