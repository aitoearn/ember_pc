use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait DeviceExploreAppDataSource: Send + Sync {
    async fn read_device_explore_profile(
        &self,
        _params: DeviceExploreReadParams,
    ) -> Result<DeviceExploreReadResponse, RuntimeCoreError> {
        Err(unavailable("read/device/explore/profile"))
    }

    async fn save_device_explore_profile(
        &self,
        _params: DeviceExploreSaveParams,
    ) -> Result<DeviceExploreSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/device/explore/profile"))
    }

    async fn save_device_explore_run(
        &self,
        _params: DeviceExploreRunSaveParams,
    ) -> Result<DeviceExploreRunSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/device/explore/run"))
    }

    async fn list_device_explore_runs(
        &self,
        _params: DeviceExploreRunListParams,
    ) -> Result<DeviceExploreRunListResponse, RuntimeCoreError> {
        Err(unavailable("list/device/explore/runs"))
    }

    async fn read_device_explore_run(
        &self,
        _params: DeviceExploreRunReadParams,
    ) -> Result<DeviceExploreRunReadResponse, RuntimeCoreError> {
        Err(unavailable("read/device/explore/run"))
    }
}

impl DeviceExploreAppDataSource for NoopAppDataSource {}
