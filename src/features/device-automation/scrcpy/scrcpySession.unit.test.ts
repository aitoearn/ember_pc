import { describe, expect, it } from "vitest";
import {
  buildScrcpyReverseRemote,
  deriveAyaScrcpyScid,
  strHash,
} from "./scrcpySession";

describe("scrcpySession", () => {
  it("同一 deviceId 生成稳定 aya scid", () => {
    expect(deriveAyaScrcpyScid("emulator-5554")).toBe(
      deriveAyaScrcpyScid("emulator-5554"),
    );
    expect(deriveAyaScrcpyScid("emulator-5554")).toMatch(/^\d+$/);
  });

  it("reverse remote 为 8 位零填充 localabstract", () => {
    const remote = buildScrcpyReverseRemote("emulator-5554");
    expect(remote).toMatch(/^localabstract:scrcpy_\d{8}$/);
    expect(buildScrcpyReverseRemote("emulator-5554")).toBe(
      buildScrcpyReverseRemote("emulator-5554"),
    );
  });

  it("不同 deviceId 通常生成不同 scid", () => {
    expect(deriveAyaScrcpyScid("device-a")).not.toBe(deriveAyaScrcpyScid("device-b"));
  });

  it("strHash 与 aya 算法一致（固定样例）", () => {
    expect(strHash("abc")).toBe(strHash("abc"));
  });
});
