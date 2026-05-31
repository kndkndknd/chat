import { describe, expect, test } from "vitest";
import { decideQuantizeFromAverage } from "../../../src/stream/quantize/decideQuantizeFromAverage";
import { bpmStreamStateType } from "../../../../../types";

const make = (
  bpm: number,
  beat: number,
  q: boolean,
  grid = true,
): bpmStreamStateType[string] => ({
  bpm,
  beat,
  gridFlag: grid,
  quantizeFlag: q,
  latency: 0,
});

describe("decideQuantizeFromAverage", () => {
  test("argParams 指定時は与えた値で全要素を更新（bpm/beat/flag）", () => {
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(120, 4, true), S2: make(100, 8, true) },
      c2: { S1: make(140, 4, true), S2: make(110, 8, true) },
    };
    const result = decideQuantizeFromAverage(obj, {
      bpm: 130,
      beat: 4,
      flag: true,
    });
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s]).toEqual({
          bpm: 130,
          beat: 4,
          gridFlag: false,
          quantizeFlag: true,
          latency: 60000 / 130 / 4,
        });
      }
    }
  });

  test("argParams 未指定時は平均値ベースで全要素を更新（quantizeFlag は多数決）", () => {
    // 4 stream / 全部 quantizeFlag=true → sum=4, denom=4, sum>denom/2 (4>2) → quantizeFlag=false
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(120, 4, true), S2: make(100, 8, true) },
      c2: { S1: make(140, 4, true), S2: make(110, 8, false) }, // 1つ false → sum=3
    };
    // sum=3 > 4/2=2 → quantizeFlag=false → gridFlag=true
    const result = decideQuantizeFromAverage(obj);
    const avgBpm = (120 + 100 + 140 + 110) / 4; // 117.5
    const avgBeat = Math.round((4 + 8 + 4 + 8) / 4); // 6
    for (const c of ["c1", "c2"]) {
      for (const s of ["S1", "S2"]) {
        expect(result[c][s]).toEqual({
          bpm: avgBpm,
          beat: avgBeat,
          gridFlag: true,
          quantizeFlag: false,
          latency: 60000 / avgBpm / avgBeat,
        });
      }
    }
  });

  test("argParams.flag のみ指定すれば bpm/beat は平均値、flag は与値", () => {
    const obj: { [c: string]: bpmStreamStateType } = {
      c1: { S1: make(60, 4, false) },
    };
    const result = decideQuantizeFromAverage(obj, { flag: true });
    expect(result.c1.S1.quantizeFlag).toBe(true);
    expect(result.c1.S1.gridFlag).toBe(false);
    expect(result.c1.S1.bpm).toBe(60);
    expect(result.c1.S1.beat).toBe(4);
  });
});
