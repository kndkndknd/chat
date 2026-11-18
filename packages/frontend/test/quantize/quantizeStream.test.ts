import { beforeEach, describe, expect, test } from "vitest";
import { ensureQuantizeStream } from "../../src/quantize/quantizeStream";
import { quantizeState } from "../../src/state";

describe("ensureQuantizeStream", () => {
  beforeEach(() => {
    quantizeState.stream = {};
  });

  test("未知の stream は flag=false で登録する", () => {
    const created = ensureQuantizeStream("UPLOAD");

    expect(created).toEqual({ flag: false, beat: 1 });
    expect(quantizeState.stream.UPLOAD).toEqual({ flag: false, beat: 1 });
  });

  test("beat 指定で登録できる", () => {
    ensureQuantizeStream("EMPTY", 4);

    expect(quantizeState.stream.EMPTY).toEqual({ flag: false, beat: 4 });
  });

  test("既存の stream は同じ参照を返す", () => {
    const existing = { flag: true, beat: 8 };
    quantizeState.stream.UPLOAD = existing;

    const result = ensureQuantizeStream("UPLOAD", 2);

    expect(result).toBe(existing);
  });
});
