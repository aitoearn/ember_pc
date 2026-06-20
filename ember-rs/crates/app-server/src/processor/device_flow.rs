//! 确定性可复现测试流与自愈回放 domain handlers
//! （deviceFlow / deviceFlowRun / deviceFlowHealing）。
use serde_json::Value;

use super::{dispatch_result, parse_params, to_jsonrpc_error, RequestProcessor, RpcDispatch};
use app_server_protocol::{
    DeviceFlowDeleteParams, DeviceFlowHealingListParams, DeviceFlowHealingResolveParams,
    DeviceFlowHealingSaveParams, DeviceFlowListParams, DeviceFlowReadParams,
    DeviceFlowRunListParams, DeviceFlowRunReadParams, DeviceFlowRunSaveParams, DeviceFlowSaveParams,
    JsonRpcError,
};

impl RequestProcessor {
    pub(super) async fn handle_device_flow_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_device_flows(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_device_flow(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_device_flow(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_delete_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowDeleteParams = parse_params(params)?;
        let response = self
            .runtime
            .delete_device_flows(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_run_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowRunSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_device_flow_run(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_run_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowRunListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_device_flow_runs(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_run_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowRunReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_device_flow_run(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_healing_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowHealingListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_device_flow_healing(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_healing_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowHealingSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_device_flow_healing(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_device_flow_healing_resolve_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: DeviceFlowHealingResolveParams = parse_params(params)?;
        let response = self
            .runtime
            .resolve_device_flow_healing(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }
}
