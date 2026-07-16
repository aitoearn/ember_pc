use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait TestCasesAppDataSource: Send + Sync {
    async fn list_test_cases(
        &self,
        _params: TestCaseListParams,
    ) -> Result<TestCaseListResponse, RuntimeCoreError> {
        Err(unavailable("list/test/cases"))
    }

    async fn read_test_case(
        &self,
        _params: TestCaseReadParams,
    ) -> Result<TestCaseReadResponse, RuntimeCoreError> {
        Err(unavailable("read/test/case"))
    }

    async fn save_test_case(
        &self,
        _params: TestCaseSaveParams,
    ) -> Result<TestCaseSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/test/case"))
    }

    async fn delete_test_cases(
        &self,
        _params: TestCaseDeleteParams,
    ) -> Result<TestCaseDeleteResponse, RuntimeCoreError> {
        Err(unavailable("delete/test/cases"))
    }

    async fn list_test_case_modules(
        &self,
        _params: TestCaseModuleListParams,
    ) -> Result<TestCaseModuleListResponse, RuntimeCoreError> {
        Err(unavailable("list/test/case/modules"))
    }

    async fn save_test_case_module(
        &self,
        _params: TestCaseModuleSaveParams,
    ) -> Result<TestCaseModuleSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/test/case/module"))
    }

    async fn delete_test_case_module(
        &self,
        _params: TestCaseModuleDeleteParams,
    ) -> Result<TestCaseModuleDeleteResponse, RuntimeCoreError> {
        Err(unavailable("delete/test/case/module"))
    }

    async fn save_test_case_run(
        &self,
        _params: TestCaseRunSaveParams,
    ) -> Result<TestCaseRunSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/test/case/run"))
    }

    async fn list_test_case_runs(
        &self,
        _params: TestCaseRunListParams,
    ) -> Result<TestCaseRunListResponse, RuntimeCoreError> {
        Err(unavailable("list/test/case/runs"))
    }
}

impl TestCasesAppDataSource for NoopAppDataSource {}
