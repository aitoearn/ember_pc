import { isElectronHostCommandAvailable } from "@/lib/electron-host";

export type DevBridgeCommandTimeoutProfile =
  | "startup-truth"
  | "agent-session-get"
  | "agent-session-list"
  | "agent-session-patch"
  | "agent-session-create"
  | "app-server-turn-start"
  | "app-server-read"
  | "agent-runtime"
  | "agent-app-ui-runtime-start"
  | "agent-app-package"
  | "knowledge-compile"
  | "voice-model-download"
  | "layered-design-project"
  | "device-automation"
  | "truth"
  | "default";

/**
 * 前端命令策略的唯一分类入口。
 *
 * current 主链命令必须走真实 Electron/Desktop Host 或 DevBridge；
 * 测试夹具只能通过 invokeMockOnly，不能由生产 invoke 自动回退 mock。
 */
const bridgeTruthCommands = new Set<string>([
  "aster_agent_init",
  "open_external_url",
  "open_update_window",
  "start_oem_cloud_oauth_callback_bridge",
  "get_or_create_default_project",
  "workspace_list",
  "workspace_get_default",
  "workspace_get",
  "workspace_ensure",
  "workspace_ensure_ready",
  "agent_runtime_submit_turn",
  "agent_runtime_interrupt_turn",
  "agent_runtime_export_evidence_pack",
  "agent_runtime_get_thread_read",
  "agent_runtime_respond_action",
  "agent_app_start_ui_runtime",
  "agent_app_get_ui_runtime_status",
  "agent_app_stop_ui_runtime",
  "agent_runtime_create_session",
  "agent_runtime_list_sessions",
  "agent_runtime_get_session",
  "agent_runtime_update_session",
  "agent_runtime_get_tool_inventory",
  "get_default_provider",
  "agent_runtime_list_workspace_skill_bindings",
  "app_server_handle_json_lines",
  "app_server_drain_events",
  "project_memory_get",
  "get_file_name",
]);

const noMockFallbackCompatCommands = new Set<string>([
  "agent_app_runtime_start_task",
  "agent_app_runtime_cancel_task",
  "agent_app_runtime_get_task",
  "agent_app_runtime_submit_host_response",
]);

const electronHostNoMockFallbackCommands = new Set([
  "open_system_settings_url",
  "save_layered_design_project_export",
  "read_layered_design_project_export",
  "recognize_layered_design_text",
  "analyze_layered_design_flat_image",
  "voice_models_delete",
  "voice_models_download",
]);

const optionalLegacyUxCommands = new Set<string>(["get_hint_routes"]);

const devBridgeAgentAppUiRuntimeStartCommands = new Set([
  "agent_app_start_ui_runtime",
  "device_automation_ensure_sidecar",
  "device_automation_get_sidecar_status",
  "device_automation_list_devices",
  "device_automation_capture_screenshot",
  "device_automation_send_navigation",
  "device_automation_ensure_ai_sidecar",
  "device_automation_prepare_ai_session",
  "device_automation_submit_ai_task",
  "device_automation_poll_ai_task",
  "device_automation_cancel_ai_task",
  "device_automation_send_tap",
  "device_automation_send_swipe",
  "device_automation_stop_sidecar",
  "device_automation_perf_list_apps",
  "device_automation_perf_start",
  "device_automation_perf_stop",
  "device_automation_perf_get_status",
  "device_automation_monkey_start",
  "device_automation_monkey_stop",
  "device_automation_monkey_get_status",
  "device_automation_perf_trace_start",
  "device_automation_perf_trace_stop",
  "device_automation_perf_trace_cancel",
  "device_automation_perf_trace_get_status",
  "device_automation_perf_trace_analyze",
  "device_automation_perf_trace_open_external",
  "device_automation_perf_trace_delete_local",
  "ui_agent_start",
  "ui_agent_cancel",
  "device_flow_record_manual_start",
  "device_flow_record_manual_stop",
  "device_flow_replay_start",
  "device_flow_replay_cancel",
]);

const devBridgeAgentAppPackageCommands = new Set([
  "agentAppLocalPackage/inspect",
]);

const electronHostLayeredDesignProjectCommands = new Set([
  "save_layered_design_project_export",
  "read_layered_design_project_export",
]);

const devBridgeCooldownBypassCommands = new Set([
  "agent_runtime_get_session",
  "agent_runtime_list_sessions",
  "agent_runtime_submit_turn",
  "agent_runtime_create_session",
  "get_or_create_default_project",
  "workspace_get",
  "workspace_get_default",
  "workspace_list",
  "workspace_ensure",
  "workspace_ensure_ready",
  "workspace_ensure_default_ready",
]);

const devBridgeReadRetryCommands = new Set([
  "agent_runtime_get_session",
  "agent_runtime_list_sessions",
]);

const devBridgeStartupTruthCommands = new Set([
  "aster_agent_init",
  "workspace_ensure_ready",
  "workspace_ensure_default_ready",
]);

const APP_SERVER_HANDLE_JSON_LINES_COMMAND = "app_server_handle_json_lines";
const APP_SERVER_AGENT_SESSION_LIST_METHOD = "agentSession/list";
const APP_SERVER_AGENT_TURN_START_METHOD = "agentSession/turn/start";
const APP_SERVER_AGENT_APP_UI_RUNTIME_START_METHOD = "agentAppUiRuntime/start";
const APP_SERVER_KNOWLEDGE_COMPILE_METHOD = "knowledgePack/compile";
const APP_SERVER_CURRENT_METHODS = new Set([
  "capability/list",
  "artifact/read",
  "fileSystem/listDirectory",
  "fileSystem/readFilePreview",
  "fileSystem/createFile",
  "fileSystem/createDirectory",
  "fileSystem/renameFile",
  "fileSystem/deleteFile",
  "agentSession/read",
  "skill/list",
  "skill/read",
  "skillManagement/list",
  "skillManagement/install",
  "skillManagement/uninstall",
  "skillRepository/list",
  "skillRepository/save",
  "skillRepository/delete",
  "skillCache/refresh",
  "skillInstalledDirectories/list",
  "skillLocal/inspect",
  "skillLocal/scaffold/create",
  "skillLocal/import",
  "skillRemote/inspect",
  "workspaceSkillBindings/list",
  "workspaceRegisteredSkills/list",
  "agentAppLocalPackage/inspect",
  "agentAppPackage/fetchCloud",
  "agentAppInstalled/save",
  "agentAppInstalled/list",
  "agentAppInstalled/disabled/set",
  "agentAppInstalled/uninstall/rehearsal",
  "agentAppInstalled/uninstall",
  "agentAppShell/prepare",
  "agentAppUiRuntime/status",
  "knowledgePack/list",
  "knowledgePack/read",
  "knowledgePack/source/import",
  "knowledgePack/compile",
  "knowledgePack/default/set",
  "knowledgePack/status/update",
  "knowledgeContext/resolve",
  "knowledgeContextRun/validate",
  "automationJob/list",
  "projectMemory/read",
  "gatewayChannel/status",
  "wechatChannel/accounts/list",
  "mediaTaskArtifact/image/create",
  "mediaTaskArtifact/audio/create",
  "mediaTaskArtifact/audio/complete",
  "mediaTaskArtifact/get",
  "mediaTaskArtifact/list",
  "mediaTaskArtifact/cancel",
  "model/list",
  "modelPreferences/list",
  "modelSyncState/read",
  "modelProvider/list",
  "modelProvider/catalog/list",
  "modelProvider/read",
  "modelProvider/create",
  "modelProvider/update",
  "modelProvider/delete",
  "modelProvider/sortOrders/update",
  "modelProvider/testConnection",
  "modelProvider/testChat",
  "modelProvider/fetchModels",
  "modelProviderKey/create",
  "modelProviderKey/update",
  "modelProviderKey/delete",
  "modelProviderKey/next",
  "modelProviderKey/usage/record",
  "modelProviderKey/error/record",
  "modelProviderUiState/read",
  "modelProviderUiState/write",
  "modelProviderConfig/export",
  "modelProviderConfig/import",
  "modelProviderAlias/read",
  "modelProviderAlias/list",
  "connectDeepLink/resolve",
  "connectOpenDeepLink/resolve",
  "voiceAsrCredential/list",
  "voiceAsrCredential/create",
  "voiceAsrCredential/update",
  "voiceAsrCredential/delete",
  "voiceAsrCredential/default/set",
  "voiceAsrCredential/test",
  "voiceInstruction/list",
  "voiceInstruction/save",
  "voiceInstruction/delete",
  "voiceModel/default/set",
  "voiceModel/testTranscribeFile",
  "testCase/list",
  "testCase/read",
  "testCase/save",
  "testCase/delete",
  "testCaseModule/list",
  "testCaseModule/save",
  "testCaseModule/delete",
  "testCaseRun/save",
  "testCaseRun/list",
  "perfMonitor/session/save",
  "perfMonitor/session/list",
  "perfMonitor/session/read",
  "deviceFlow/list",
  "deviceFlow/read",
  "deviceFlow/save",
  "deviceFlow/delete",
  "deviceFlowRun/save",
  "deviceFlowRun/list",
  "deviceFlowRun/read",
  "deviceFlowHealing/list",
  "deviceFlowHealing/save",
  "deviceFlowHealing/resolve",
  "deviceExplore/read",
  "deviceExplore/save",
  "deviceExploreRun/save",
  "deviceExploreRun/list",
  "deviceExploreRun/read",
]);
const APP_SERVER_STARTUP_TRUTH_METHODS = new Set([
  "workspace/default/read",
  "workspace/default/ensure",
  "workspace/list",
  "workspace/read",
  "workspace/update",
  "workspace/delete",
  "workspace/byPath/read",
  "workspace/ensure",
  "workspace/projectsRoot/read",
  "workspace/projectPath/resolve",
  "workspace/ensureReady",
]);

const bridgeTruthEventPrefixes = [
  "voice-model-download-progress",
  "aster_stream_",
  "agent_subagent_status:",
  "agent_subagent_stream:",
  "device_automation_inventory_changed",
  "device_automation_perf_frame",
  "device_automation_monkey_event",
  "device_automation_perf_trace_progress",
];

export function isBridgeTruthCommand(command: string): boolean {
  return bridgeTruthCommands.has(command);
}

export function shouldDisallowMockFallbackCommand(command: string): boolean {
  return (
    isBridgeTruthCommand(command) ||
    noMockFallbackCompatCommands.has(command) ||
    electronHostNoMockFallbackCommands.has(command)
  );
}

export function isOptionalLegacyUxCommand(command: string): boolean {
  return optionalLegacyUxCommands.has(command);
}

export function isOptionalLegacyUxCommandAvailable(command: string): boolean {
  return (
    isOptionalLegacyUxCommand(command) &&
    isElectronHostCommandAvailable(command)
  );
}

export function areOptionalLegacyUxCommandsAvailable(
  commands: string[],
): boolean {
  return commands.every(isOptionalLegacyUxCommandAvailable);
}

export function isBridgeTruthEvent(eventName: string): boolean {
  const normalizedEventName = eventName.trim();
  if (!normalizedEventName) {
    return false;
  }
  return bridgeTruthEventPrefixes.some((prefix) =>
    normalizedEventName.startsWith(prefix),
  );
}

export function shouldBypassDevBridgeCooldown(command: string): boolean {
  return devBridgeCooldownBypassCommands.has(command);
}

export function shouldRetryDevBridgeReadCommand(command: string): boolean {
  return devBridgeReadRetryCommands.has(command);
}

export function resolveDevBridgeCommandTimeoutProfile(
  command: string,
  args?: unknown,
): DevBridgeCommandTimeoutProfile {
  if (devBridgeStartupTruthCommands.has(command)) {
    return "startup-truth";
  }
  if (command === "agent_runtime_get_session") {
    return "agent-session-get";
  }
  if (command === "agent_runtime_list_sessions") {
    return "agent-session-list";
  }
  if (command === "agent_runtime_update_session") {
    return "agent-session-patch";
  }
  if (command === "agent_runtime_create_session") {
    return "agent-session-create";
  }
  if (isAppServerAgentTurnStartCommand(command, args)) {
    return "app-server-turn-start";
  }
  if (isAppServerAgentAppUiRuntimeStartCommand(command, args)) {
    return "agent-app-ui-runtime-start";
  }
  if (isAppServerAgentSessionListCommand(command, args)) {
    return "agent-session-list";
  }
  if (isAppServerStartupTruthCommand(command, args)) {
    return "startup-truth";
  }
  if (isAppServerKnowledgeCompileCommand(command, args)) {
    return "knowledge-compile";
  }
  if (isAppServerCurrentMethodCommand(command, args)) {
    return "app-server-read";
  }
  if (
    command.startsWith("agent_app_runtime_") ||
    command.startsWith("agent_runtime_")
  ) {
    return "agent-runtime";
  }
  if (devBridgeAgentAppUiRuntimeStartCommands.has(command)) {
    return "agent-app-ui-runtime-start";
  }
  if (devBridgeAgentAppPackageCommands.has(command)) {
    return "agent-app-package";
  }
  if (command === "voice_models_download") {
    return "voice-model-download";
  }
  if (electronHostLayeredDesignProjectCommands.has(command)) {
    return "layered-design-project";
  }
  // 设备自动化命令涉及 adb 与 agent-device daemon 会话（含切换设备的 close+重开），
  // 真机操作耗时远超默认 1800ms，统一走更宽松的超时档。
  if (command.startsWith("device_automation_")) {
    return "device-automation";
  }
  if (
    command === APP_SERVER_HANDLE_JSON_LINES_COMMAND &&
    extractAppServerJsonLines(args).length > 0
  ) {
    return "app-server-read";
  }
  if (isBridgeTruthCommand(command)) {
    return "truth";
  }
  return "default";
}

function isAppServerAgentSessionListCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasMethod(line, APP_SERVER_AGENT_SESSION_LIST_METHOD),
  );
}

function isAppServerAgentTurnStartCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasMethod(line, APP_SERVER_AGENT_TURN_START_METHOD),
  );
}

function isAppServerAgentAppUiRuntimeStartCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasMethod(line, APP_SERVER_AGENT_APP_UI_RUNTIME_START_METHOD),
  );
}

function isAppServerStartupTruthCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasAnyMethod(line, APP_SERVER_STARTUP_TRUTH_METHODS),
  );
}

function isAppServerKnowledgeCompileCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasMethod(line, APP_SERVER_KNOWLEDGE_COMPILE_METHOD),
  );
}

function isAppServerCurrentMethodCommand(
  command: string,
  args: unknown,
): boolean {
  if (command !== APP_SERVER_HANDLE_JSON_LINES_COMMAND) {
    return false;
  }
  return extractAppServerJsonLines(args).some((line) =>
    jsonRpcLineHasAnyMethod(line, APP_SERVER_CURRENT_METHODS),
  );
}

function extractAppServerJsonLines(args: unknown): string[] {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return [];
  }
  const request = (args as { request?: unknown }).request;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return [];
  }
  const lines = (request as { lines?: unknown }).lines;
  if (!Array.isArray(lines)) {
    return [];
  }
  return lines.filter((line): line is string => typeof line === "string");
}

function jsonRpcLineHasMethod(line: string, method: string): boolean {
  return jsonRpcLineHasAnyMethod(line, new Set([method]));
}

function jsonRpcLineHasAnyMethod(
  line: string,
  methods: ReadonlySet<string>,
): boolean {
  try {
    const parsed = JSON.parse(line.trim()) as { method?: unknown } | null;
    return Boolean(
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.method === "string" &&
      methods.has(parsed.method),
    );
  } catch {
    return false;
  }
}
