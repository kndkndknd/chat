import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../src/data", () => ({
  cmdLog: [{ cmd: "OLDEST" }, { cmd: "MIDDLE" }, { cmd: "NEWEST" }],
}));

beforeEach(async () => {
  // モジュール内 cmdLogNum を 0 にリセット
  const mod = await import("../../src/logging/getLogCmd");
  mod.resetCmdLogNum();
});

describe("getLogCmd", () => {
  test("ArrowUp で 1 つ前のコマンド (NEWEST) を返す", async () => {
    const { getLogCmd } = await import("../../src/logging/getLogCmd");
    expect(getLogCmd("ArrowUp")).toBe("NEWEST");
  });

  test("ArrowUp を繰り返すとさらに過去 (MIDDLE → OLDEST) を返す", async () => {
    const { getLogCmd } = await import("../../src/logging/getLogCmd");
    getLogCmd("ArrowUp"); // → NEWEST
    expect(getLogCmd("ArrowUp")).toBe("MIDDLE");
    expect(getLogCmd("ArrowUp")).toBe("OLDEST");
  });

  test("ArrowDown で 0 まで戻れば空文字", async () => {
    const { getLogCmd } = await import("../../src/logging/getLogCmd");
    getLogCmd("ArrowUp"); // 1
    getLogCmd("ArrowDown"); // 0
    expect(getLogCmd("ArrowDown")).toBe("");
  });

  test("どの方向キーでもない入力で cmdLogNum=0 のときは空文字", async () => {
    const { getLogCmd } = await import("../../src/logging/getLogCmd");
    expect(getLogCmd("Other")).toBe("");
  });
});
