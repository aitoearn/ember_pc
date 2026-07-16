use super::unavailable;
use super::NoopAppDataSource;
use super::RuntimeCoreError;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
pub trait DeviceFlowAppDataSource: Send + Sync {
    async fn list_device_flows(
        &self,
        _params: DeviceFlowListParams,
    ) -> Result<DeviceFlowListResponse, RuntimeCoreError> {
        Err(unavailable("list/device/flows"))
    }

    async fn read_device_flow(
        &self,
        _params: DeviceFlowReadParams,
    ) -> Result<DeviceFlowReadResponse, RuntimeCoreError> {
        Err(unavailable("read/device/flow"))
    }

    async fn save_device_flow(
        &self,
        _params: DeviceFlowSaveParams,
    ) -> Result<DeviceFlowSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/device/flow"))
    }

    async fn delete_device_flows(
        &self,
        _params: DeviceFlowDeleteParams,
    ) -> Result<DeviceFlowDeleteResponse, RuntimeCoreError> {
        Err(unavailable("delete/device/flows"))
    }

    async fn save_device_flow_run(
        &self,
        _params: DeviceFlowRunSaveParams,
    ) -> Result<DeviceFlowRunSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/device/flow/run"))
    }

    async fn list_device_flow_runs(
        &self,
        _params: DeviceFlowRunListParams,
    ) -> Result<DeviceFlowRunListResponse, RuntimeCoreError> {
        Err(unavailable("list/device/flow/runs"))
    }

    async fn read_device_flow_run(
        &self,
        _params: DeviceFlowRunReadParams,
    ) -> Result<DeviceFlowRunReadResponse, RuntimeCoreError> {
        Err(unavailable("read/device/flow/run"))
    }

    async fn list_device_flow_healing(
        &self,
        _params: DeviceFlowHealingListParams,
    ) -> Result<DeviceFlowHealingListResponse, RuntimeCoreError> {
        Err(unavailable("list/device/flow/healing"))
    }

    async fn save_device_flow_healing(
        &self,
        _params: DeviceFlowHealingSaveParams,
    ) -> Result<DeviceFlowHealingSaveResponse, RuntimeCoreError> {
        Err(unavailable("save/device/flow/healing"))
    }

    async fn resolve_device_flow_healing(
        &self,
        _params: DeviceFlowHealingResolveParams,
    ) -> Result<DeviceFlowHealingResolveResponse, RuntimeCoreError> {
        Err(unavailable("resolve/device/flow/healing"))
    }
}

impl DeviceFlowAppDataSource for NoopAppDataSource {}
