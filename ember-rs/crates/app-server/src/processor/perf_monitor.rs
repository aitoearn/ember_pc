//! 性能监控会话 domain handlers（perfMonitor/session/*）。

use serde_json::Value;

use super::{dispatch_result, parse_params, to_jsonrpc_error, RequestProcessor, RpcDispatch};
use app_server_protocol::{
    JsonRpcError, PerfMonitorSessionListParams, PerfMonitorSessionReadParams,
    PerfMonitorSessionSaveParams,
};

impl RequestProcessor {
    pub(super) async fn handle_perf_monitor_session_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorSessionSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_perf_monitor_session(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_session_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorSessionListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_perf_monitor_sessions(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_perf_monitor_session_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: PerfMonitorSessionReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_perf_monitor_session(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }
}
