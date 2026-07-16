use super::super::*;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
impl DeviceExploreAppDataSource for LocalAppDataSource {
    async fn read_device_explore_profile(
        &self,
        params: DeviceExploreReadParams,
    ) -> Result<DeviceExploreReadResponse, RuntimeCoreError> {
        Ok(super::super::device_explore::read_device_explore_profile(&self.db, params)?)
    }

    async fn save_device_explore_profile(
        &self,
        params: DeviceExploreSaveParams,
    ) -> Result<DeviceExploreSaveResponse, RuntimeCoreError> {
        Ok(super::super::device_explore::save_device_explore_profile(&self.db, params)?)
    }

    async fn save_device_explore_run(
        &self,
        params: DeviceExploreRunSaveParams,
    ) -> Result<DeviceExploreRunSaveResponse, RuntimeCoreError> {
        Ok(super::super::device_explore::save_device_explore_run(&self.db, params)?)
    }

    async fn list_device_explore_runs(
        &self,
        params: DeviceExploreRunListParams,
    ) -> Result<DeviceExploreRunListResponse, RuntimeCoreError> {
        Ok(super::super::device_explore::list_device_explore_runs(&self.db, params)?)
    }

    async fn read_device_explore_run(
        &self,
        params: DeviceExploreRunReadParams,
    ) -> Result<DeviceExploreRunReadResponse, RuntimeCoreError> {
        Ok(super::super::device_explore::read_device_explore_run(&self.db, params)?)
    }
}
