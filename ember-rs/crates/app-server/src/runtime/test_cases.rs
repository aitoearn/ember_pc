use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
    pub async fn list_test_cases(
        &self,
        params: TestCaseListParams,
    ) -> Result<TestCaseListResponse, RuntimeCoreError> {
        self.app_data_source.list_test_cases(params).await
    }

    pub async fn read_test_case(
        &self,
        params: TestCaseReadParams,
    ) -> Result<TestCaseReadResponse, RuntimeCoreError> {
        self.app_data_source.read_test_case(params).await
    }

    pub async fn save_test_case(
        &self,
        params: TestCaseSaveParams,
    ) -> Result<TestCaseSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_test_case(params).await
    }

    pub async fn delete_test_cases(
        &self,
        params: TestCaseDeleteParams,
    ) -> Result<TestCaseDeleteResponse, RuntimeCoreError> {
        self.app_data_source.delete_test_cases(params).await
    }

    pub async fn list_test_case_modules(
        &self,
        params: TestCaseModuleListParams,
    ) -> Result<TestCaseModuleListResponse, RuntimeCoreError> {
        self.app_data_source.list_test_case_modules(params).await
    }

    pub async fn save_test_case_module(
        &self,
        params: TestCaseModuleSaveParams,
    ) -> Result<TestCaseModuleSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_test_case_module(params).await
    }

    pub async fn delete_test_case_module(
        &self,
        params: TestCaseModuleDeleteParams,
    ) -> Result<TestCaseModuleDeleteResponse, RuntimeCoreError> {
        self.app_data_source.delete_test_case_module(params).await
    }

    pub async fn save_test_case_run(
        &self,
        params: TestCaseRunSaveParams,
    ) -> Result<TestCaseRunSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_test_case_run(params).await
    }

    pub async fn list_test_case_runs(
        &self,
        params: TestCaseRunListParams,
    ) -> Result<TestCaseRunListResponse, RuntimeCoreError> {
        self.app_data_source.list_test_case_runs(params).await
    }
}
