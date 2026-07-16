use super::{RuntimeCore, RuntimeCoreError};
use app_server_protocol::*;

impl RuntimeCore {
    pub async fn list_device_flows(
        &self,
        params: DeviceFlowListParams,
    ) -> Result<DeviceFlowListResponse, RuntimeCoreError> {
        self.app_data_source.list_device_flows(params).await
    }

    pub async fn read_device_flow(
        &self,
        params: DeviceFlowReadParams,
    ) -> Result<DeviceFlowReadResponse, RuntimeCoreError> {
        self.app_data_source.read_device_flow(params).await
    }

    pub async fn save_device_flow(
        &self,
        params: DeviceFlowSaveParams,
    ) -> Result<DeviceFlowSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_device_flow(params).await
    }

    pub async fn delete_device_flows(
        &self,
        params: DeviceFlowDeleteParams,
    ) -> Result<DeviceFlowDeleteResponse, RuntimeCoreError> {
        self.app_data_source.delete_device_flows(params).await
    }

    pub async fn save_device_flow_run(
        &self,
        params: DeviceFlowRunSaveParams,
    ) -> Result<DeviceFlowRunSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_device_flow_run(params).await
    }

    pub async fn list_device_flow_runs(
        &self,
        params: DeviceFlowRunListParams,
    ) -> Result<DeviceFlowRunListResponse, RuntimeCoreError> {
        self.app_data_source.list_device_flow_runs(params).await
    }

    pub async fn read_device_flow_run(
        &self,
        params: DeviceFlowRunReadParams,
    ) -> Result<DeviceFlowRunReadResponse, RuntimeCoreError> {
        self.app_data_source.read_device_flow_run(params).await
    }

    pub async fn list_device_flow_healing(
        &self,
        params: DeviceFlowHealingListParams,
    ) -> Result<DeviceFlowHealingListResponse, RuntimeCoreError> {
        self.app_data_source.list_device_flow_healing(params).await
    }

    pub async fn save_device_flow_healing(
        &self,
        params: DeviceFlowHealingSaveParams,
    ) -> Result<DeviceFlowHealingSaveResponse, RuntimeCoreError> {
        self.app_data_source.save_device_flow_healing(params).await
    }

    pub async fn resolve_device_flow_healing(
        &self,
        params: DeviceFlowHealingResolveParams,
    ) -> Result<DeviceFlowHealingResolveResponse, RuntimeCoreError> {
        self.app_data_source.resolve_device_flow_healing(params).await
    }
}
