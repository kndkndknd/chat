import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  bpmState: {} as Record<string, any>,
  bpmStateDefault: {
    bpm: 60,
    beat: 4,
    metronomeFlag: true,
    modulationFlag: false,
    gridFlag: false,
    quantizeFlag: false,
    latency: 250,
    torchType: "STEADY",
    torchBlinkFlag: false,
  },
}));
vi.mock("../../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

import { setParamsSplitQuantize } from "../../../src/stream/quantize/setParamsSplitQuantize";
import { bpmState } from "../../../src/state";

const baseStream = (q: boolean) => ({
  bpm: 60,
  beat: 4,
  gridFlag: false,
  quantizeFlag: q,
  latency: 250,
});

const setupBpmState = (clients: string[]) => {
  for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  for (const c of clients) {
    (bpmState as any)[c] = {
      stream: {
        PLAYBACK: baseStream(false),
        TIMELAPSE: baseStream(false),
        EMPTY: baseStream(false),
      },
    };
  }
};

describe("setParamsSplitQuantize", () => {
  beforeEach(() => setupBpmState(["c1", "c2"]));

  test("params.flag が undefined のとき: 対象が全部 quantizeFlag=true なら true 維持", () => {
    setupBpmState(["c1"]);
    (bpmState as any).c1.stream.PLAYBACK.quantizeFlag = true;
    (bpmState as any).c1.stream.TIMELAPSE.quantizeFlag = true;
    (bpmState as any).c1.stream.EMPTY.quantizeFlag = true;
    const result = setParamsSplitQuantize({}, ["c1"]);
    for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
      expect(result.c1[s].quantizeFlag).toBe(true);
    }
  });

  test("params.flag が undefined のとき: 1 つでも false が混じれば全部 false に統一される", () => {
    setupBpmState(["c1"]);
    (bpmState as any).c1.stream.PLAYBACK.quantizeFlag = true;
    (bpmState as any).c1.stream.TIMELAPSE.quantizeFlag = false; // 混在
    (bpmState as any).c1.stream.EMPTY.quantizeFlag = true;
    const result = setParamsSplitQuantize({}, ["c1"]);
    for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
      expect(result.c1[s].quantizeFlag).toBe(false);
    }
  });

  test("params.flag=true 指定時は対象 client のストリームを quantizeFlag=true・gridFlag=false に", () => {
    const result = setParamsSplitQuantize({ flag: true }, ["c1"]);
    for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
      expect(result.c1[s].quantizeFlag).toBe(true);
      expect(result.c1[s].gridFlag).toBe(false);
    }
    // c2 は対象外なので変化なし
    for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
      expect(result.c2[s].quantizeFlag).toBe(false);
    }
  });

  test("params.beat と params.bpm を指定すれば対象に反映される", () => {
    const result = setParamsSplitQuantize(
      { flag: true, beat: 8, bpm: 90 },
      ["c1"],
    );
    expect(result.c1.PLAYBACK.beat).toBe(8);
    expect(result.c1.PLAYBACK.bpm).toBe(90);
  });

  test("params.stream を指定すればその stream のみ更新", () => {
    const result = setParamsSplitQuantize(
      { flag: true, stream: "PLAYBACK" as any },
      ["c1"],
    );
    expect(result.c1.PLAYBACK.quantizeFlag).toBe(true);
    expect(result.c1.TIMELAPSE.quantizeFlag).toBe(false);
    expect(result.c1.EMPTY.quantizeFlag).toBe(false);
  });

  test("target が undefined または 'all' なら全クライアントが対象", () => {
    const result = setParamsSplitQuantize({ flag: true });
    for (const c of ["c1", "c2"]) {
      for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
        expect(result[c][s].quantizeFlag).toBe(true);
      }
    }
  });
});
