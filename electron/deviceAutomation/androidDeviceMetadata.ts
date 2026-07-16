import { execAdbSync } from "./scrcpyAdbFastPath";
import type { AgentDeviceCliRecord } from "./agentDeviceCli";

const METADATA_CACHE_TTL_MS = 30_000;
const ENRICH_CONCURRENCY = 3;

export type AndroidDeviceMetadata = {
  brand?: string;
  manufacturer?: string;
  model?: string;
  resolution?: string;
  platformVersion?: string;
};

type MetadataCacheEntry = {
  metadata: AndroidDeviceMetadata;
  expiresAt: number;
};

const metadataCache = new Map<string, MetadataCacheEntry>();

/** 解析 adb shell wm size 输出，返回如 1080x2400。 */
export function parseAndroidDisplaySize(raw: string): string | undefined {
  const physical = raw.match(/Physical size:\s*(\d+)x(\d+)/i);
  if (physical) {
    return `${physical[1]}x${physical[2]}`;
  }
  const override = raw.match(/Override size:\s*(\d+)x(\d+)/i);
  if (override) {
    return `${override[1]}x${override[2]}`;
  }
  const direct = raw.trim().match(/^(\d+)x(\d+)$/);
  if (direct) {
    return `${direct[1]}x${direct[2]}`;
  }
  return undefined;
}

/** 解析单次 adb shell 批量查询输出。 */
export function parseAndroidMetadataShellOutput(
  raw: string,
): AndroidDeviceMetadata {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  const brand = lines[0] || undefined;
  const manufacturer = lines[1] || undefined;
  const model = lines[2] || undefined;
  const platformVersion = lines[3] || undefined;
  const wmRaw = lines.slice(4).join("\n");
  const resolution = parseAndroidDisplaySize(wmRaw);
  return {
    brand: brand || undefined,
    manufacturer: manufacturer || undefined,
    model: model || undefined,
    platformVersion: platformVersion || undefined,
    resolution,
  };
}

function queryAndroidDeviceMetadata(deviceId: string): AndroidDeviceMetadata {
  const script =
    "getprop ro.product.brand; getprop ro.product.manufacturer; getprop ro.product.model; getprop ro.build.version.release; wm size";
  const result = execAdbSync(deviceId, ["shell", script]);
  if (result.exitCode !== 0) {
    return {};
  }
  return parseAndroidMetadataShellOutput(result.stdout);
}

function getCachedAndroidMetadata(deviceId: string): AndroidDeviceMetadata {
  const now = Date.now();
  const cached = metadataCache.get(deviceId);
  if (cached && cached.expiresAt > now) {
    return cached.metadata;
  }
  const metadata = queryAndroidDeviceMetadata(deviceId);
  metadataCache.set(deviceId, {
    metadata,
    expiresAt: now + METADATA_CACHE_TTL_MS,
  });
  return metadata;
}

function mergeAndroidMetadata(
  device: AgentDeviceCliRecord,
  metadata: AndroidDeviceMetadata,
): AgentDeviceCliRecord {
  return {
    ...device,
    brand: metadata.brand ?? device.brand,
    manufacturer: metadata.manufacturer ?? device.manufacturer,
    model: metadata.model ?? device.model,
    resolution: metadata.resolution ?? device.resolution,
    platformVersion: metadata.platformVersion ?? device.platformVersion,
  };
}

function shouldEnrichAndroidDevice(device: AgentDeviceCliRecord): boolean {
  return device.platform === "android" && device.booted !== false;
}

/** 为 Android 在线设备补全 adb 元数据（品牌/型号/分辨率/系统版本）。 */
export async function enrichAndroidDeviceRecords(
  devices: AgentDeviceCliRecord[],
): Promise<AgentDeviceCliRecord[]> {
  if (devices.length === 0) {
    return devices;
  }

  const result = devices.map((device) => ({ ...device }));
  const targets = devices
    .map((device, index) => ({ device, index }))
    .filter(({ device }) => shouldEnrichAndroidDevice(device));

  for (let offset = 0; offset < targets.length; offset += ENRICH_CONCURRENCY) {
    const chunk = targets.slice(offset, offset + ENRICH_CONCURRENCY);
    for (const { device, index } of chunk) {
      const metadata = getCachedAndroidMetadata(device.id);
      result[index] = mergeAndroidMetadata(device, metadata);
    }
  }

  return result;
}

/** 测试专用：清空 adb 元数据缓存。 */
export function resetAndroidDeviceMetadataCacheForTests(): void {
  metadataCache.clear();
}
