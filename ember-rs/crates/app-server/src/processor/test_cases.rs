//! 测试用例管理 domain handlers（testCase / testCaseModule）。
use serde_json::Value;

use super::{dispatch_result, parse_params, to_jsonrpc_error, RequestProcessor, RpcDispatch};
use app_server_protocol::{
    JsonRpcError, TestCaseDeleteParams, TestCaseListParams, TestCaseModuleDeleteParams,
    TestCaseModuleListParams, TestCaseModuleSaveParams, TestCaseReadParams, TestCaseRunListParams,
    TestCaseRunSaveParams, TestCaseSaveParams,
};

impl RequestProcessor {
    pub(super) async fn handle_test_case_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_test_cases(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_read_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseReadParams = parse_params(params)?;
        let response = self
            .runtime
            .read_test_case(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_test_case(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_delete_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseDeleteParams = parse_params(params)?;
        let response = self
            .runtime
            .delete_test_cases(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_module_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseModuleListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_test_case_modules(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_module_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseModuleSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_test_case_module(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_module_delete_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseModuleDeleteParams = parse_params(params)?;
        let response = self
            .runtime
            .delete_test_case_module(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_run_save_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseRunSaveParams = parse_params(params)?;
        let response = self
            .runtime
            .save_test_case_run(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }

    pub(super) async fn handle_test_case_run_list_impl(
        &self,
        params: Option<Value>,
    ) -> Result<RpcDispatch, JsonRpcError> {
        self.ensure_initialized()?;
        let params: TestCaseRunListParams = parse_params(params)?;
        let response = self
            .runtime
            .list_test_case_runs(params)
            .await
            .map_err(to_jsonrpc_error)?;
        dispatch_result(response)
    }
}
