use super::super::*;
use app_server_protocol::*;
use async_trait::async_trait;

#[async_trait]
impl DeviceFlowAppDataSource for LocalAppDataSource {
    async fn list_device_flows(
        &self,
        params: DeviceFlowListParams,
    ) -> Result<DeviceFlowListResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::list_device_flows(&self.db, params)?)
    }

    async fn read_device_flow(
        &self,
        params: DeviceFlowReadParams,
    ) -> Result<DeviceFlowReadResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::read_device_flow(&self.db, params)?)
    }

    async fn save_device_flow(
        &self,
        params: DeviceFlowSaveParams,
    ) -> Result<DeviceFlowSaveResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::save_device_flow(&self.db, params)?)
    }

    async fn delete_device_flows(
        &self,
        params: DeviceFlowDeleteParams,
    ) -> Result<DeviceFlowDeleteResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::delete_device_flows(&self.db, params)?)
    }

    async fn save_device_flow_run(
        &self,
        params: DeviceFlowRunSaveParams,
    ) -> Result<DeviceFlowRunSaveResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::save_device_flow_run(&self.db, params)?)
    }

    async fn list_device_flow_runs(
        &self,
        params: DeviceFlowRunListParams,
    ) -> Result<DeviceFlowRunListResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::list_device_flow_runs(&self.db, params)?)
    }

    async fn read_device_flow_run(
        &self,
        params: DeviceFlowRunReadParams,
    ) -> Result<DeviceFlowRunReadResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::read_device_flow_run(&self.db, params)?)
    }

    async fn list_device_flow_healing(
        &self,
        params: DeviceFlowHealingListParams,
    ) -> Result<DeviceFlowHealingListResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::list_device_flow_healing(&self.db, params)?)
    }

    async fn save_device_flow_healing(
        &self,
        params: DeviceFlowHealingSaveParams,
    ) -> Result<DeviceFlowHealingSaveResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::save_device_flow_healing(&self.db, params)?)
    }

    async fn resolve_device_flow_healing(
        &self,
        params: DeviceFlowHealingResolveParams,
    ) -> Result<DeviceFlowHealingResolveResponse, RuntimeCoreError> {
        Ok(super::super::device_flow::resolve_device_flow_healing(&self.db, params)?)
    }
}
