import { describe, expect, test, vi, beforeEach } from "vitest";

const { ioMock } = vi.hoisted(() => ({
  ioMock: { emit: vi.fn(), to: vi.fn(() => ({ emit: vi.fn() })) },
}));

vi.mock("../../src/state", () => ({
  previousState: { text: "" },
}));
vi.mock("../../src/state/states/ioState", () => ({
  ioState: { io: ioMock },
}));
vi.mock("../../src/cmd/receiveEnter", () => ({ receiveEnter: vi.fn() }));
vi.mock("../../src/cmd/stopEmit", () => ({ stopEmit: vi.fn() }));
vi.mock("../../src/cmd/metronomeBpmSet", () => ({ metronomeBpmSet: vi.fn() }));
vi.mock("../../src/socket/ioEmit", () => ({ stringEmit: vi.fn() }));
vi.mock("../../src/logging/getLogCmd", () => ({
  getLogCmd: vi.fn(() => "FROM_LOG"),
  resetCmdLogNum: vi.fn(),
}));
vi.mock("../../src/logging/cmdLogging", () => ({ cmdLogging: vi.fn() }));

import { charProcess } from "../../src/cmd/charProcess";
import { previousState } from "../../src/state";

describe("charProcess", () => {
  beforeEach(() => {
    previousState.text = "";
    ioMock.emit.mockClear();
    ioMock.to.mockClear();
  });

  test("Enter で strings を空文字にして返す", () => {
    expect(charProcess("Enter", "BASS", "id1")).toBe("");
  });

  test("ArrowUp は getLogCmd の戻り値を返す", () => {
    expect(charProcess("ArrowUp", "ANY", "id1")).toBe("FROM_LOG");
  });

  test("Backspace で末尾 1 文字削る", () => {
    expect(charProcess("Backspace", "ABCD", "id1")).toBe("ABC");
  });

  test("Tab/ArrowRight で空文字に", () => {
    expect(charProcess("Tab", "ABC", "id1")).toBe("");
    expect(charProcess("ArrowRight", "ABC", "id1")).toBe("");
  });

  test("Escape で空文字、cmdLogging('STOP') 経由 stopEmit が呼ばれる", () => {
    expect(charProcess("Escape", "X", "id1")).toBe("");
  });

  test("通常文字は strings に連結される", () => {
    expect(charProcess("a", "BAS", "id1")).toBe("BASa");
  });

  test("BASS で previousState.text が更新", () => {
    charProcess("BASS", "", "id1");
    expect(previousState.text).toBe("BASS");
  });

  test("Shift は何も変えない", () => {
    expect(charProcess("Shift", "FOO", "id1")).toBe("FOO");
  });
});
