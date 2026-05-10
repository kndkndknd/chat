import { describe, expect, test } from "vitest";
import { classifyArgs } from "../../../src/cmd/splitSpace/splitQuantize";

describe("classifyArgs", () => {
  test("空配列は {} を返す", () => {
    expect(classifyArgs([])).toEqual({});
  });

  test("TRUE/FALSE は flag に格納（大文字小文字を問わず）", () => {
    expect(classifyArgs(["TRUE"])).toEqual({ flag: true });
    expect(classifyArgs(["false"])).toEqual({ flag: false });
  });

  test("streamList の値（CHAT/PLAYBACK/TIMELAPSE/EMPTY）は stream に格納", () => {
    expect(classifyArgs(["PLAYBACK"])).toEqual({ stream: "PLAYBACK" });
    expect(classifyArgs(["empty"])).toEqual({ stream: "EMPTY" });
  });

  test("数値が <=32 なら beat に、>=33 なら bpm に格納", () => {
    expect(classifyArgs(["4"])).toEqual({ beat: 4 });
    expect(classifyArgs(["32"])).toEqual({ beat: 32 });
    expect(classifyArgs(["33"])).toEqual({ bpm: 33 });
    expect(classifyArgs(["120"])).toEqual({ bpm: 120 });
  });

  test("4要素の典型例: bpm + beat + stream + flag を全て分類", () => {
    expect(
      classifyArgs(["120", "4", "PLAYBACK", "TRUE"]),
    ).toEqual({ bpm: 120, beat: 4, stream: "PLAYBACK", flag: true });
  });

  test("該当しない値（記号や混在）は捨てられる", () => {
    expect(classifyArgs(["FOO!", "12-34", "abc"])).toEqual({});
  });

  test("各カテゴリ最初に一致したもののみ採用される", () => {
    // 2つ目以降の TRUE/PLAYBACK/4 は捨てられる
    expect(
      classifyArgs(["TRUE", "FALSE", "PLAYBACK", "EMPTY", "4", "8"]),
    ).toEqual({ flag: true, stream: "PLAYBACK", beat: 4 });
  });

  test("入力周りが trim される", () => {
    expect(classifyArgs(["  TRUE  ", " 4 "])).toEqual({ flag: true, beat: 4 });
  });
});
