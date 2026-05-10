import { describe, expect, test } from "vitest";
import { buffKey } from "../../../src/redis/streamsRedis";

describe("buffKey", () => {
  test("name を埋め込んだキー文字列を返す", () => {
    expect(buffKey("PLAYBACK")).toBe("streams:PLAYBACK:buff");
    expect(buffKey("CHAT")).toBe("streams:CHAT:buff");
  });

  test("空文字でもエラーにならず生成", () => {
    expect(buffKey("")).toBe("streams::buff");
  });
});
