import { describe, expect, test } from "vitest";
import {
  millisecondsPerBar,
  millisecondsPerBeat,
  secondsPerEighthNote,
} from "../../src/util/bpmCalc";

describe("bpmCalc", () => {
  test("millisecondsPerBar は4拍ぶんのミリ秒を返す", () => {
    expect(millisecondsPerBar(120)).toBe(2000);
    expect(millisecondsPerBar(60)).toBe(4000);
  });

  test("secondsPerEighthNote は8分音符の秒数を返す", () => {
    expect(secondsPerEighthNote(120)).toBe(0.25);
  });

  test("millisecondsPerBeat は1拍ぶんのミリ秒を返す", () => {
    expect(millisecondsPerBeat(120)).toBe(500);
  });

  test("millisecondsPerBeat は BPM 0 以下で例外を投げる", () => {
    expect(() => millisecondsPerBeat(0)).toThrow("BPM must be greater than 0");
    expect(() => millisecondsPerBeat(-1)).toThrow("BPM must be greater than 0");
  });
});
