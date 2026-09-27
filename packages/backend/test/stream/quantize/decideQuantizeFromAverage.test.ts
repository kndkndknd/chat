import { describe, expect, test } from "vitest";
import { decideQuantizeFromAverage } from "../../../src/stream/quantize/decideQuantizeFromAverage";
import { bpmStreamStateType } from "../../../../../types";

const make = (
  beat: number,
  q: boolean,
  grid = true,
): bpmStreamStateType[string] => ({
  beat,
  gridFlag: grid,
  quantizeFlag: q,
});

describe("decideQuantizeFromAverage", () => {
  test("argParams 指定時は与えた値で全要素を更新（beat/flag）", () => {
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(4, true), S2: make(8, true) },
      c2: { S1: make(4, true), S2: make(8, true) },
    };
    const result = decideQuantizeFromAverage(obj, {
      beat: 4,
      flag: true,
    });
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s]).toEqual({
          beat: 4,
          gridFlag: false,
          quantizeFlag: true,
        });
      }
    }
  });

  test("argParams 未指定時は平均値ベースで全要素を更新（quantizeFlag は多数決）", () => {
    // 4 stream / 3 つ quantizeFlag=true → sum=3, denom=4, sum>denom/2 (3>2) → quantizeFlag=false
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(4, true), S2: make(8, true) },
      c2: { S1: make(4, true), S2: make(8, false) }, // 1つ false → sum=3
    };
    const result = decideQuantizeFromAverage(obj);
    const avgBeat = Math.round((4 + 8 + 4 + 8) / 4); // 6
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s]).toEqual({
          beat: avgBeat,
          gridFlag: true,
          quantizeFlag: false,
        });
      }
    }
  });

  test("argParams.flag のみ指定すれば beat は平均値、flag は与値", () => {
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(4, false) },
    };
    const result = decideQuantizeFromAverage(obj, { flag: true });
    expect(result.c1.S1.quantizeFlag).toBe(true);
    expect(result.c1.S1.gridFlag).toBe(false);
    expect(result.c1.S1.beat).toBe(4);
  });
});
