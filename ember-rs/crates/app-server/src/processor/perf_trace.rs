//! P2 · Perfetto trace domain handlers（perfMonitor/trace/*、traceAnalysis/*）。

use serde_json::Value;

use super::{dispatch_result, parse_params, to_jsonrpc_error, RequestProcessor, RpcDispatch};
use app_server_protocol::{
    JsonRpcError, PerfMonitorTraceAnalysisListParams, PerfMonitorTraceAnalysisSaveParams,
    PerfMonitorTraceDeleteParams, PerfMonitorTraceListParams, PerfMonitorTraceReadParams,
    PerfMonitorTraceSaveParams,
};

impl RequestProcessor {
    pub(super) async fn handle_perf_monitor_trace_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_perf_monitor_trace(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_trace_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_perf_monitor_traces(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_trace_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_perf_monitor_trace(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_trace_delete_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceDeleteParams = parse_params(params)?;
        let response = self
            .runtime
            .delete_perf_monitor_trace(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_trace_analysis_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceAnalysisSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_perf_monitor_trace_analysis(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_trace_analysis_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorTraceAnalysisListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_perf_monitor_trace_analyses(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }
}
