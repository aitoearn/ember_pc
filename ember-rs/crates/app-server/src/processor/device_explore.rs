//! 工作区探索压测 handlers（profile + run 留痕）。

use serde_json::Value;

use super::{dispatch_result, parse_params, to_jsonrpc_error, RequestProcessor, RpcDispatch};
use app_server_protocol::{
    DeviceExploreReadParams, DeviceExploreRunListParams, DeviceExploreRunReadParams,
    DeviceExploreRunSaveParams, DeviceExploreSaveParams, JsonRpcError,
};

impl RequestProcessor {
    pub(super) async fn handle_device_explore_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceExploreReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_device_explore_profile(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_explore_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceExploreSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_device_explore_profile(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_explore_run_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceExploreRunSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_device_explore_run(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_explore_run_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceExploreRunListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_device_explore_runs(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_explore_run_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceExploreRunReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_device_explore_run(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }
}
