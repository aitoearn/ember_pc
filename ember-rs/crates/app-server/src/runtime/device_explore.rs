use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
    pub async fn read_device_explore_profile(
        &self,
        params: DeviceExploreReadParams,
    ) -> Result<DeviceExploreReadResponse, RuntimeCoreError> {
        self.app_data_source.read_device_explore_profile(params).await
    }

    pub async fn save_device_explore_profile(
        &self,
        params: DeviceExploreSaveParams,
    ) -> Result<DeviceExploreSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_device_explore_profile(params).await
    }

    pub async fn save_device_explore_run(
        &self,
        params: DeviceExploreRunSaveParams,
    ) -> Result<DeviceExploreRunSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_device_explore_run(params).await
    }

    pub async fn list_device_explore_runs(
        &self,
        params: DeviceExploreRunListParams,
    ) -> Result<DeviceExploreRunListResponse, RuntimeCoreError> {
        self.app_data_source.list_device_explore_runs(params).await
    }

    pub async fn read_device_explore_run(
        &self,
        params: DeviceExploreRunReadParams,
    ) -> Result<DeviceExploreRunReadResponse, RuntimeCoreError> {
        self.app_data_source.read_device_explore_run(params).await
    }
}
