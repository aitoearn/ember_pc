/**
 * 确定性流回放运行时：wait → locate → 执行 → 断言，事件经 `deviceFlow:replay:event:<runId>` 桥接。
 */

import type {
  FlowRunConclusion,
  FlowRunStepStatus,
  FlowStep,
  Locator,
  TestFlow,
} from "../../src/features/device-automation/flow/domain/flowFormat";
import { deviceActivityLock } from "./deviceActivityLock";
import { captureDeviceScreenshot, dumpUiTreeXml } from "./flowUiDump";
import { tryLocateLocators, type FlowLocatorHit } from "./flowLocator";
import { waitForUiStable } from "./flowWaiter";
import { executeFlowStepOp, evaluateHardAssertion } from "./flowExecutor";
import { healFlowStep } from "./flowHealer";

export type DeviceFlowReplayEventEmitter = (
  event: string,
  payload?: unknown,
) => void;

export interface StartDeviceFlowReplayParams {
  runId: string;
  flowId: string;
  deviceId: string;
  serial: string;
  flow: TestFlow;
  selfHealingEnabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface ReplayRunState {
  runId: string;
  deviceId: string;
  cancelled: boolean;
}

export function deviceFlowReplayEventChannel(runId: string): string {
  return `deviceFlow:replay:event:${runId}`;
}

class DeviceFlowReplayRuntime {
  readonly #runs = new Map<string, ReplayRunState>();

  start(
    params: StartDeviceFlowReplayParams,
    emit: DeviceFlowReplayEventEmitter,
  ): { runId: string } {
    const runId = params.runId?.trim();
    const deviceId = params.deviceId?.trim();
    if (!runId || !deviceId) {
      throw new Error("device_flow_replay_start 需要 runId 与 deviceId");
    }
    if (params.flow.platform !== "android") {
      throw new Error("unsupported_platform");
    }
    const lock = deviceActivityLock.tryAcquire(deviceId, "flow_replay", runId);
    if (!lock.ok) {
      throw new Error(lock.message);
    }
    if (this.#runs.has(runId)) {
      deviceActivityLock.release(deviceId, runId);
      throw new Error(`回放任务已存在：${runId}`);
    }
    this.#runs.set(runId, { runId, deviceId, cancelled: false });
    const channel = deviceFlowReplayEventChannel(runId);
    void this.#runLoop(params, emit, channel).finally(() => {
      this.#runs.delete(runId);
      deviceActivityLock.release(deviceId, runId);
    });
    return { runId };
  }

  cancel(runId: string): { cancelled: boolean } {
    const state = this.#runs.get(runId);
    if (!state) {
      return { cancelled: false };
    }
    state.cancelled = true;
    return { cancelled: true };
  }

  async #runLoop(
    params: StartDeviceFlowReplayParams,
    emit: DeviceFlowReplayEventEmitter,
    channel: string,
  ): Promise<void> {
    const state = this.#runs.get(params.runId);
    if (!state) {
      return;
    }
    let llmTokenUsed = 0;
    let healingTriggered = false;
    let conclusion: FlowRunConclusion = "passed";
    let failedStep: number | null = null;

    try {
      for (const step of params.flow.steps) {
        if (state.cancelled) {
          conclusion = "blocked";
          emit(channel, {
            runId: params.runId,
            type: "done",
            conclusion,
            healingTriggered,
            llmTokenUsed,
            summary: "回放已取消",
          });
          return;
        }

        const startedAt = Date.now();
        emit(channel, {
          runId: params.runId,
          type: "step",
          index: step.index,
          op: step.op,
          status: "running",
        });

        const waitPolicy = step.wait ?? {
          stabilizeMs: 400,
          timeoutMs: 8000,
        };
        const waitResult = await waitForUiStable({
          stabilizeMs: waitPolicy.stabilizeMs,
          timeoutMs: waitPolicy.timeoutMs,
          captureDump: async () => dumpUiTreeXml(params.deviceId),
        });
        if (!waitResult.ok) {
          conclusion = "failed";
          failedStep = step.index;
          emit(channel, {
            runId: params.runId,
            type: "result",
            index: step.index,
            status: "failed",
            durationMs: Date.now() - startedAt,
          });
          break;
        }

        let shot = captureDeviceScreenshot(params.deviceId);
        emit(channel, {
          runId: params.runId,
          type: "screenshot",
          index: step.index,
          imageBase64: shot.base64,
          mediaType: shot.mediaType,
        });

        let hit: FlowLocatorHit | undefined;
        const locators = step.locators ?? [];
        if (locators.length > 0) {
          for (const locator of locators) {
            emit(channel, {
              runId: params.runId,
              type: "locating",
              index: step.index,
              locatorKind: locator.kind,
            });
          }
          const dumpXml = dumpUiTreeXml(params.deviceId);
          const locateResult = tryLocateLocators(locators, dumpXml, shot);
          if ("centerX" in locateResult) {
            hit = locateResult;
          }
        }

        let stepStatus: FlowRunStepStatus = "passed";
        let healedLocator: Locator | undefined;

        if (locators.length > 0 && !hit) {
          if (params.selfHealingEnabled && params.baseUrl && params.apiKey && params.model) {
            emit(channel, {
              runId: params.runId,
              type: "healing",
              index: step.index,
              reason: "确定性定位全部失配",
            });
            healingTriggered = true;
            const healResult = await healFlowStep({
              step,
              screenshotBase64: shot.base64,
              mediaType: shot.mediaType,
              screen: shot,
              baseUrl: params.baseUrl,
              apiKey: params.apiKey,
              model: params.model,
            });
            llmTokenUsed += healResult.tokenUsed;
            if (healResult.ok) {
              healedLocator = healResult.healedLocator;
              const retryDump = dumpUiTreeXml(params.deviceId);
              const retry = tryLocateLocators([healedLocator], retryDump, shot);
              if ("centerX" in retry) {
                hit = retry;
                stepStatus = "healed";
                emit(channel, {
                  runId: params.runId,
                  type: "healed",
                  index: step.index,
                  healedLocator,
                });
              }
            }
          }
          if (!hit) {
            stepStatus = params.selfHealingEnabled ? "blocked" : "failed";
            conclusion = stepStatus === "blocked" ? "blocked" : "failed";
            failedStep = step.index;
            emit(channel, {
              runId: params.runId,
              type: "result",
              index: step.index,
              status: stepStatus,
              durationMs: Date.now() - startedAt,
            });
            break;
          }
        }

        try {
          await executeFlowStepOp({
            deviceId: params.deviceId,
            step,
            hit,
            screen: shot,
          });
        } catch (execError) {
          stepStatus = "failed";
          conclusion = "failed";
          failedStep = step.index;
          emit(channel, {
            runId: params.runId,
            type: "error",
            message:
              execError instanceof Error ? execError.message : String(execError),
          });
          emit(channel, {
            runId: params.runId,
            type: "result",
            index: step.index,
            status: "failed",
            durationMs: Date.now() - startedAt,
          });
          break;
        }

        if (step.assert?.type === "hard") {
          const assertDump = dumpUiTreeXml(params.deviceId);
          const assertResult = evaluateHardAssertion(
            step.assert.expr,
            assertDump,
            shot,
          );
          emit(channel, {
            runId: params.runId,
            type: "assert",
            index: step.index,
            ok: assertResult.ok,
            reason: assertResult.reason,
          });
          if (!assertResult.ok) {
            stepStatus = "failed";
            conclusion = "failed";
            failedStep = step.index;
            emit(channel, {
              runId: params.runId,
              type: "result",
              index: step.index,
              status: "failed",
              durationMs: Date.now() - startedAt,
            });
            break;
          }
        }

        emit(channel, {
          runId: params.runId,
          type: "result",
          index: step.index,
          status: stepStatus,
          durationMs: Date.now() - startedAt,
        });
      }

      const summary =
        conclusion === "passed"
          ? "回放通过"
          : failedStep !== null
            ? `步骤 ${failedStep} 失败`
            : "回放未完成";

      emit(channel, {
        runId: params.runId,
        type: "done",
        conclusion,
        healingTriggered,
        llmTokenUsed,
        summary,
      });
    } catch (error) {
      emit(channel, {
        runId: params.runId,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      emit(channel, {
        runId: params.runId,
        type: "done",
        conclusion: "blocked",
        healingTriggered,
        llmTokenUsed,
        summary: "回放异常终止",
      });
    }
  }
}

export const deviceFlowReplayRuntime = new DeviceFlowReplayRuntime();
