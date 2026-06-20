/** 默认引擎：Fastbot 逐步模式（Kea2 对齐）。 */
export const MONKEY_DEFAULT_ENGINE_MODE = "fastbot" as const;

export const MONKEY_ENGINE_MODES = ["fastbot", "system"] as const;

/** 默认覆盖率同步周期（Kea2 profile-period）。 */
export const MONKEY_DEFAULT_PROFILE_PERIOD = 25;

/** 默认事件数 / maxStep（Kea2 `--max-step`）。 */
export const MONKEY_DEFAULT_EVENT_COUNT = 1000;

/** 默认事件间隔毫秒（Kea2 `--throttle` 默认 200）。 */
export const MONKEY_DEFAULT_THROTTLE_MS = 200;

/** 默认最长运行分钟（Kea2 `--running-minutes` 默认 10）。 */
export const MONKEY_DEFAULT_RUNNING_MINUTES = 10;

export const MONKEY_EVENT_COUNT_OPTIONS = [500, 1000, 5000, 10000] as const;

export const MONKEY_THROTTLE_OPTIONS_MS = [0, 100, 200, 500, 1000] as const;

export const MONKEY_RUNNING_MINUTES_OPTIONS = [1, 5, 10, 30, 60] as const;

export const MONKEY_PROFILE_PERIOD_OPTIONS = [10, 25, 50, 100] as const;
