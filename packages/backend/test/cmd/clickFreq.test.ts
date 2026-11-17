import { beforeEach, describe, expect, test } from "vitest";
import { clickFreq } from "../../src/cmd/clickFreq";
import { cmdState } from "../../src/state/states/cmdState";

const A4 = 440;

describe("clickFreq", () => {
  beforeEach(() => {
    cmdState.CLICKFREQ = A4;
  });

  test("SAME は現在の周波数をそのまま返す", () => {
    expect(clickFreq("SAME")).toBe(A4);

    cmdState.CLICKFREQ = 528;
    expect(clickFreq("SAME")).toBe(528);
  });

  test("UP は A メジャースケールの次の音へ進む", () => {
    expect(clickFreq("UP")).toBeCloseTo(A4 * Math.pow(2, 2 / 12), 6);
  });

  test("DOWN は A メジャースケールの前の音へ戻る", () => {
    expect(clickFreq("DOWN")).toBeCloseTo(A4 * Math.pow(2, -1 / 12), 6);
  });

  test("G# から UP すると次のオクターブの A になる", () => {
    cmdState.CLICKFREQ = A4 * Math.pow(2, 11 / 12);

    expect(clickFreq("UP")).toBeCloseTo(A4 * 2, 6);
  });

  test("A から DOWN すると前のオクターブの G# になる", () => {
    expect(clickFreq("DOWN")).toBeCloseTo((A4 / 2) * Math.pow(2, 11 / 12), 6);
  });

  test("スケール外の周波数は最も近いスケール音として扱う", () => {
    cmdState.CLICKFREQ = 450;

    expect(clickFreq("UP")).toBeCloseTo(A4 * Math.pow(2, 2 / 12), 6);
    expect(clickFreq("SAME")).toBe(450);
  });
});
