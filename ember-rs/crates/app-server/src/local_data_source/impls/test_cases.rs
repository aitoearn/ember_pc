use super::super::*;
use async_trait::async_trait;

#[async_trait]
impl TestCasesAppDataSource for LocalAppDataSource {
    async fn list_test_cases(
        &self,
        params: TestCaseListParams,
    ) -> Result<TestCaseListResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::list_test_cases(&self.db, params)?)
    }

    async fn read_test_case(
        &self,
        params: TestCaseReadParams,
    ) -> Result<TestCaseReadResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::read_test_case(&self.db, params)?)
    }

    async fn save_test_case(
        &self,
        params: TestCaseSaveParams,
    ) -> Result<TestCaseSaveResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::save_test_case(&self.db, params)?)
    }

    async fn delete_test_cases(
        &self,
        params: TestCaseDeleteParams,
    ) -> Result<TestCaseDeleteResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::delete_test_cases(&self.db, params)?)
    }

    async fn list_test_case_modules(
        &self,
        params: TestCaseModuleListParams,
    ) -> Result<TestCaseModuleListResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::list_test_case_modules(&self.db, params)?)
    }

    async fn save_test_case_module(
        &self,
        params: TestCaseModuleSaveParams,
    ) -> Result<TestCaseModuleSaveResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::save_test_case_module(&self.db, params)?)
    }

    async fn delete_test_case_module(
        &self,
        params: TestCaseModuleDeleteParams,
    ) -> Result<TestCaseModuleDeleteResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::delete_test_case_module(&self.db, params)?)
    }

    async fn save_test_case_run(
        &self,
        params: TestCaseRunSaveParams,
    ) -> Result<TestCaseRunSaveResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::save_test_case_run(&self.db, params)?)
    }

    async fn list_test_case_runs(
        &self,
        params: TestCaseRunListParams,
    ) -> Result<TestCaseRunListResponse, RuntimeCoreError> {
        Ok(super::super::test_cases::list_test_case_runs(&self.db, params)?)
    }
}
