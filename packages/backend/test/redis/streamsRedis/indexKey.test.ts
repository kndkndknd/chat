import { describe, expect, test } from "vitest";
import { indexKey } from "../../../src/redis/streamsRedis";

describe("indexKey", () => {
  test("name を埋め込んだキー文字列を返す", () => {
    expect(indexKey("PLAYBACK")).toBe("streams:PLAYBACK:index");
  });

  test("空文字でもエラーにならず生成", () => {
    expect(indexKey("")).toBe("streams::index");
  });
});
