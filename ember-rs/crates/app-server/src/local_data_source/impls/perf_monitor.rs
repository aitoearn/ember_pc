use super::super::*;
use async_trait::async_trait;

#[async_trait]
impl PerfMonitorAppDataSource for LocalAppDataSource {
    async fn save_perf_monitor_session(
        &self,
        params: PerfMonitorSessionSaveParams,
    ) -> Result<PerfMonitorSessionSaveResponse, RuntimeCoreError> {
        Ok(super::super::perf_monitor::save_perf_monitor_session(&self.db, params)?)
    }

    async fn list_perf_monitor_sessions(
        &self,
        params: PerfMonitorSessionListParams,
    ) -> Result<PerfMonitorSessionListResponse, RuntimeCoreError> {
        Ok(super::super::perf_monitor::list_perf_monitor_sessions(&self.db, params)?)
    }

    async fn read_perf_monitor_session(
        &self,
        params: PerfMonitorSessionReadParams,
    ) -> Result<PerfMonitorSessionReadResponse, RuntimeCoreError> {
        Ok(super::super::perf_monitor::read_perf_monitor_session(&self.db, params)?)
    }
}
