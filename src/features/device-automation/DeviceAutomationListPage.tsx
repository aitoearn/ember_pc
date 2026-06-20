import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  CirclePlay,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  scheduleScrcpyPrewarmForDevice,
  shouldPrewarmScrcpyDevice,
} from "./scrcpy/scrcpyPrewarm";
import { DevicePlatformBadge } from "./components/DevicePlatformBadge";
import type {
  DeviceAutomationCardModel,
  DeviceAutomationPlatform,
  DeviceAutomationStatus,
} from "./types";

const ALL = "all";
type AllOr<T extends string> = typeof ALL | T;
type DeviceAutomationStatusLabelKey =
  `deviceAutomation.status.${DeviceAutomationStatus}`;

interface DeviceAutomationCardProps {
  device: DeviceAutomationCardModel;
  onOpenDebug: (deviceId: string) => void;
}

const STATUS_BADGE: Record<
  DeviceAutomationStatus,
  { className: string; dotClassName: string; labelKey: DeviceAutomationStatusLabelKey }
> = {
  online: {
    className: "bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
    labelKey: "deviceAutomation.status.online",
  },
  busy: {
    className: "bg-amber-50 text-amber-800",
    dotClassName: "bg-amber-500",
    labelKey: "deviceAutomation.status.busy",
  },
  offline: {
    className: "bg-neutral-100 text-neutral-600",
    dotClassName: "bg-neutral-400",
    labelKey: "deviceAutomation.status.offline",
  },
  maintenance: {
    className: "bg-orange-50 text-orange-800",
    dotClassName: "bg-orange-500",
    labelKey: "deviceAutomation.status.maintenance",
  },
  automating: {
    className: "bg-sky-50 text-sky-800",
    dotClassName: "bg-sky-500",
    labelKey: "deviceAutomation.status.automating",
  },
};

function PhoneVisual({ platform }: { platform: DeviceAutomationPlatform }) {
  const screen =
    platform === "ios" ? (
      <span className="text-[11px] font-semibold text-neutral-700" aria-hidden>
        iOS
      </span>
    ) : platform === "harmony" ? (
      <span className="text-[10px] font-bold text-[#ce0e2d]" aria-hidden>
        HUAWEI
      </span>
    ) : (
      <Smartphone
        className="size-6 text-[#3DDC84]"
        strokeWidth={1.75}
        aria-hidden
      />
    );

  return (
    <div className="flex h-[100px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-neutral-200/80 bg-gradient-to-b from-neutral-100 to-neutral-200/90 shadow-inner">
      <div className="flex h-[82px] w-[58px] items-center justify-center rounded-[8px] bg-white shadow-sm">
        {screen}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-11 shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 break-all text-neutral-800">{value}</span>
    </div>
  );
}

export function DeviceAutomationCard({
  device,
  onOpenDebug,
}: DeviceAutomationCardProps) {
  const { t } = useTranslation("deviceAutomation");
  const badge = STATUS_BADGE[device.status] ?? STATUS_BADGE.offline;

  const copySerial = async () => {
    try {
      await navigator.clipboard.writeText(device.serial);
    } catch (error) {
      console.error("复制序列号失败:", error);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] transition-shadow",
        device.status === "online" &&
          "hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12)]",
      )}
      onMouseEnter={() => {
        if (shouldPrewarmScrcpyDevice(device)) {
          scheduleScrcpyPrewarmForDevice(device.id);
        }
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-snug text-neutral-900">
              {device.name}
            </h3>
            <DevicePlatformBadge platform={device.platform} />
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            badge.className,
          )}
        >
          <span className={cn("size-1.5 rounded-full", badge.dotClassName)} />
          {t(badge.labelKey)}
        </span>
      </div>

      <div className="mb-4 flex gap-3">
        <PhoneVisual platform={device.platform} />
        <div className="min-w-0 flex-1 space-y-1.5 text-[13px]">
          <div className="flex items-baseline gap-1">
            <span className="shrink-0 text-neutral-500">
              {t("deviceAutomation.fields.serial")}
            </span>
            <span
              className="min-w-0 truncate font-mono text-[11px] text-neutral-800"
              title={device.serial}
            >
              {device.serial.length > 18
                ? `${device.serial.slice(0, 18)}…`
                : device.serial}
            </span>
            <button
              type="button"
              onClick={() => {
                void copySerial();
              }}
              className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label={t("deviceAutomation.actions.copySerial")}
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          <InfoRow label={t("deviceAutomation.fields.brand")} value={device.brand} />
          <InfoRow label={t("deviceAutomation.fields.model")} value={device.model} />
          <InfoRow label={t("deviceAutomation.fields.system")} value={device.system} />
          <InfoRow
            label={t("deviceAutomation.fields.resolution")}
            value={device.resolution}
          />
          <InfoRow label={t("deviceAutomation.fields.group")} value={device.group} />
          <InfoRow label={t("deviceAutomation.fields.space")} value={device.space} />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-neutral-600 hover:text-neutral-900"
          disabled
        >
          <Info className="size-3.5 text-neutral-500" />
          {t("deviceAutomation.actions.viewDetails")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 border-0 bg-[#7c3aed] px-3 text-white shadow-sm hover:bg-[#6d28d9] disabled:opacity-60"
          disabled={device.status !== "online"}
          onClick={() => onOpenDebug(device.id)}
        >
          <CirclePlay className="size-3.5" />
          {t("deviceAutomation.actions.useNow")}
        </Button>
      </div>
    </div>
  );
}

interface DeviceAutomationListPageProps {
  devices: DeviceAutomationCardModel[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onOpenDebug: (deviceId: string) => void;
}

export function DeviceAutomationListPage({
  devices,
  loading,
  error,
  onRefresh,
  onOpenDebug,
}: DeviceAutomationListPageProps) {
  const { t } = useTranslation("deviceAutomation");
  const [searchSerial, setSearchSerial] = useState("");
  const [brandKey, setBrandKey] = useState<AllOr<string>>(ALL);
  const [platformKey, setPlatformKey] = useState<AllOr<DeviceAutomationPlatform>>(
    ALL,
  );
  const [statusKey, setStatusKey] = useState<AllOr<DeviceAutomationStatus>>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const brandOptions = useMemo(() => {
    const values = new Set<string>();
    devices.forEach((device) => {
      if (device.brand && device.brand !== "—") {
        values.add(device.brand);
      }
    });
    return [ALL, ...Array.from(values).sort()];
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (
        searchSerial &&
        !device.serial.toLowerCase().includes(searchSerial.toLowerCase().trim())
      ) {
        return false;
      }
      if (brandKey !== ALL && device.brand !== brandKey) {
        return false;
      }
      if (platformKey !== ALL && device.platform !== platformKey) {
        return false;
      }
      if (statusKey !== ALL && device.status !== statusKey) {
        return false;
      }
      return true;
    });
  }, [devices, searchSerial, brandKey, platformKey, statusKey]);

  const total = filteredDevices.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [searchSerial, brandKey, platformKey, statusKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, page, pageSize]);

  const pageNumbers = useMemo(() => {
    const max = 5;
    const half = Math.floor(max / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  const handleQuery = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleReset = useCallback(async () => {
    setSearchSerial("");
    setBrandKey(ALL);
    setPlatformKey(ALL);
    setStatusKey(ALL);
    setPage(1);
    setPageSize(10);
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = window.setInterval(() => {
      void onRefresh();
    }, 10_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefresh, onRefresh]);

  return (
    <div className="min-h-full">
      <div className="mb-4 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
          <div className="relative min-w-[200px] flex-1 lg:max-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchSerial}
              onChange={(event) => setSearchSerial(event.target.value)}
              placeholder={t("deviceAutomation.filters.serialPlaceholder")}
              className="h-9 border-neutral-200 pl-9"
            />
          </div>
          <Select
            value={brandKey}
            onValueChange={(value) => value != null && setBrandKey(value)}
          >
            <SelectTrigger className="h-9 w-full min-w-[120px] lg:w-[140px]">
              <SelectValue placeholder={t("deviceAutomation.filters.brand")} />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand === ALL
                    ? t("deviceAutomation.filters.allBrands")
                    : brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={platformKey}
            onValueChange={(value) =>
              setPlatformKey(value as AllOr<DeviceAutomationPlatform>)
            }
          >
            <SelectTrigger className="h-9 w-full min-w-[120px] lg:w-[140px]">
              <SelectValue placeholder={t("deviceAutomation.filters.platform")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t("deviceAutomation.filters.allPlatforms")}
              </SelectItem>
              <SelectItem value="android">Android</SelectItem>
              <SelectItem value="ios">iOS</SelectItem>
              <SelectItem value="harmony">HarmonyOS</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusKey}
            onValueChange={(value) =>
              setStatusKey(value as AllOr<DeviceAutomationStatus>)
            }
          >
            <SelectTrigger className="h-9 w-full min-w-[120px] lg:w-[140px]">
              <SelectValue placeholder={t("deviceAutomation.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t("deviceAutomation.filters.allStatuses")}
              </SelectItem>
              <SelectItem value="online">
                {t("deviceAutomation.status.online")}
              </SelectItem>
              <SelectItem value="busy">
                {t("deviceAutomation.status.busy")}
              </SelectItem>
              <SelectItem value="automating">
                {t("deviceAutomation.status.automating")}
              </SelectItem>
              <SelectItem value="offline">
                {t("deviceAutomation.status.offline")}
              </SelectItem>
              <SelectItem value="maintenance">
                {t("deviceAutomation.status.maintenance")}
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-9 gap-1.5 bg-[#7c3aed] px-4 text-white hover:bg-[#6d28d9]"
              onClick={() => {
                void handleQuery();
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {t("deviceAutomation.actions.query")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => {
                void handleReset();
              }}
              disabled={refreshing}
            >
              <RefreshCw className="size-4" />
              {t("deviceAutomation.actions.reset")}
            </Button>
            <label className="ml-0 flex cursor-pointer items-center gap-2 text-sm text-neutral-600 lg:ml-1">
              <Checkbox
                checked={autoRefresh}
                onCheckedChange={(checked) => setAutoRefresh(checked === true)}
              />
              <span className="select-none">
                {t("deviceAutomation.actions.autoRefresh")}
              </span>
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && pagedDevices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-500">
            {t("deviceAutomation.list.loading")}
          </div>
        ) : pagedDevices.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-500">
            {t("deviceAutomation.list.empty")}
          </div>
        ) : (
          pagedDevices.map((device) => (
            <DeviceAutomationCard
              key={device.id}
              device={device}
              onOpenDebug={onOpenDebug}
            />
          ))
        )}
      </div>

      {total > 0 ? (
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-neutral-200/80 pt-4 sm:flex-row sm:items-center">
          <p className="text-sm text-neutral-600">
            {t("deviceAutomation.list.total", { count: total })}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label={t("deviceAutomation.pagination.previous")}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === page ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 min-w-8 px-2.5",
                    pageNumber === page &&
                      "border-0 bg-[#7c3aed] text-white hover:bg-[#6d28d9]",
                  )}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                aria-label={t("deviceAutomation.pagination.next")}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  {t("deviceAutomation.pagination.pageSize10")}
                </SelectItem>
                <SelectItem value="20">
                  {t("deviceAutomation.pagination.pageSize20")}
                </SelectItem>
                <SelectItem value="50">
                  {t("deviceAutomation.pagination.pageSize50")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
