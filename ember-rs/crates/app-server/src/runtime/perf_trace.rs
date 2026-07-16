use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
    pub async fn save_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceSaveParams,
    ) -> Result<PerfMonitorTraceSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_perf_monitor_trace(params).await
    }

    pub async fn list_perf_monitor_traces(
        &self,
        params: PerfMonitorTraceListParams,
    ) -> Result<PerfMonitorTraceListResponse, RuntimeCoreError> {
        self.app_data_source.list_perf_monitor_traces(params).await
    }

    pub async fn read_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceReadParams,
    ) -> Result<PerfMonitorTraceReadResponse, RuntimeCoreError> {
        self.app_data_source.read_perf_monitor_trace(params).await
    }

    pub async fn delete_perf_monitor_trace(
        &self,
        params: PerfMonitorTraceDeleteParams,
    ) -> Result<PerfMonitorTraceDeleteResponse, RuntimeCoreError> {
        self.app_data_source.delete_perf_monitor_trace(params).await
    }

    pub async fn save_perf_monitor_trace_analysis(
        &self,
        params: PerfMonitorTraceAnalysisSaveParams,
    ) -> Result<PerfMonitorTraceAnalysisSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_perf_monitor_trace_analysis(params).await
    }

    pub async fn list_perf_monitor_trace_analyses(
        &self,
        params: PerfMonitorTraceAnalysisListParams,
    ) -> Result<PerfMonitorTraceAnalysisListResponse, RuntimeCoreError> {
        self.app_data_source.list_perf_monitor_trace_analyses(params).await
    }
}
