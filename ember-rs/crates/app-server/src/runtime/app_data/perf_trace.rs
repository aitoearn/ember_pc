use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait PerfTraceAppDataSource: Send + Sync {
    async fn save_perf_monitor_trace(
        &self,
        _params: PerfMonitorTraceSaveParams,
    ) -> Result<PerfMonitorTraceSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/perf/monitor/trace"))
    }

    async fn list_perf_monitor_traces(
        &self,
        _params: PerfMonitorTraceListParams,
    ) -> Result<PerfMonitorTraceListResponse, RuntimeCoreError> {
        Err(unavailable("list/perf/monitor/traces"))
    }

    async fn read_perf_monitor_trace(
        &self,
        _params: PerfMonitorTraceReadParams,
    ) -> Result<PerfMonitorTraceReadResponse, RuntimeCoreError> {
        Err(unavailable("read/perf/monitor/trace"))
    }

    async fn delete_perf_monitor_trace(
        &self,
        _params: PerfMonitorTraceDeleteParams,
    ) -> Result<PerfMonitorTraceDeleteResponse, RuntimeCoreError> {
        Err(unavailable("delete/perf/monitor/trace"))
    }

    async fn save_perf_monitor_trace_analysis(
        &self,
        _params: PerfMonitorTraceAnalysisSaveParams,
    ) -> Result<PerfMonitorTraceAnalysisSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/perf/monitor/trace/analysis"))
    }

    async fn list_perf_monitor_trace_analyses(
        &self,
        _params: PerfMonitorTraceAnalysisListParams,
    ) -> Result<PerfMonitorTraceAnalysisListResponse, RuntimeCoreError> {
        Err(unavailable("list/perf/monitor/trace/analyses"))
    }
}

impl PerfTraceAppDataSource for NoopAppDataSource {}
