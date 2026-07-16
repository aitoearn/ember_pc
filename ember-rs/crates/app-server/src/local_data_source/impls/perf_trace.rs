use super::super::*;
use async_trait::async_trait;

#[async_trait]
impl PerfTraceAppDataSource for LocalAppDataSource {
    async fn save_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceSaveParams,
    ) -> Result<PerfMonitorTraceSaveResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::save_perf_monitor_trace(&self.db, params)?)
    }

    async fn list_perf_monitor_traces(
        &self,
        params: PerfMonitorTraceListParams,
    ) -> Result<PerfMonitorTraceListResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::list_perf_monitor_traces(&self.db, params)?)
    }

    async fn read_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceReadParams,
    ) -> Result<PerfMonitorTraceReadResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::read_perf_monitor_trace(&self.db, params)?)
    }

    async fn delete_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceDeleteParams,
    ) -> Result<PerfMonitorTraceDeleteResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::delete_perf_monitor_trace(&self.db, params)?)
    }

    async fn save_perf_monitor_trace_analysis(
        &self,
        params: PerfMonitorTraceAnalysisSaveParams,
    ) -> Result<PerfMonitorTraceAnalysisSaveResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::save_perf_monitor_trace_analysis(&self.db, params)?)
    }

    async fn list_perf_monitor_trace_analyses(
        &self,
        params: PerfMonitorTraceAnalysisListParams,
    ) -> Result<PerfMonitorTraceAnalysisListResponse, RuntimeCoreError> {
        Ok(super::super::perf_trace::list_perf_monitor_trace_analyses(&self.db, params)?)
    }
}
