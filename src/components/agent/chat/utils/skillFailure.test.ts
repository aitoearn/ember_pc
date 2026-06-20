import { describe, expect, it } from "vitest";
import { formatSkillFailureMessage, resolveSkillFailure } from "./skillFailure";

describe("resolveSkillFailure", () => {
  it("应解析显式错误码", () => {
    const result = resolveSkillFailure("skill_not_found|Skill 'writer' 不存在");

    expect(result.code).toBe("skill_not_found");
    expect(result.message).toContain("不存在");
  });

  it("应识别 provider 不可用错误", () => {
    const result = resolveSkillFailure("无法配置任何可用的 Provider");

    expect(result.code).toBe("skill_provider_unavailable");
  });

  it("应识别取消执行错误", () => {
    const result = resolveSkillFailure("Execution cancelled by user");

    expect(result.code).toBe("skill_cancelled");
  });

  it("应识别 stream 错误", () => {
    const result = resolveSkillFailure("Stream error: connection reset");

    expect(result.code).toBe("skill_stream_failed");
  });

  it("未知错误应回退为通用错误码", () => {
    const result = resolveSkillFailure("some unknown failure");

    expect(result.code).toBe("skill_execute_failed");
  });
});

describe("formatSkillFailureMessage", () => {
  it("应输出包含错误码与恢复建议的文案", () => {
    const text = formatSkillFailureMessage(
      resolveSkillFailure("skill_session_init_failed|无法创建会话"),
    );

    expect(text).toContain("skill_session_init_failed");
    expect(text).toContain("建议：");
  });
});
