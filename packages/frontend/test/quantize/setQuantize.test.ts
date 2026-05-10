import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/state", () => ({
  quantizeState: {
    flag: false,
    bar: 0,
    beat: 1,
    interval: null as number | null,
    currentTime: 0,
    timeout: 0,
    stream: [] as string[],
  },
  streamFlagState: { CHAT: false, PLAYBACK: false } as Record<string, boolean>,
  streamChunk: {} as Record<string, any>,
  contextState: { audioContext: { currentTime: 0 } },
  socketState: {
    socketId: "self",
    socket: { emit: vi.fn() },
  },
}));
vi.mock("../../src/stream", () => ({ chatReq: vi.fn() }));
vi.mock("../../src/quantize/quantizePlay", () => ({ quantizePlay: vi.fn() }));
vi.mock("../../../util/bpmCalc", () => ({
  millisecondsPerBar: (bpm: number) => (60000 / bpm) * 4,
}));

import { setQuantize } from "../../src/quantize/setQuantize";
import { quantizeState } from "../../src/state";

const make = (bpm: number, beat: number, q: boolean) => ({
  bpm,
  beat,
  gridFlag: false,
  quantizeFlag: q,
  latency: 0,
});

describe("setQuantize", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    quantizeState.flag = false;
    quantizeState.bar = 0;
    quantizeState.beat = 1;
    quantizeState.interval = null;
    quantizeState.currentTime = 0;
    quantizeState.timeout = 0;
    quantizeState.stream = [];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("interval=null のとき新規 quantizeInterval を作成し、bar/beat/flag が反映される", () => {
    const data: any = { CHAT: make(120, 4, true) };
    const result = setQuantize(data);
    expect(result.bar).toBe(2000); // 60000/120*4
    expect(result.beat).toBe(4);
    expect(result.flag).toBe(true);
    expect(result.stream).toEqual(["CHAT"]);
    expect(quantizeState.interval).not.toBeNull();
  });

  test("既に interval が立っていて bar が同値ならクリアされる（再生成なし）", () => {
    quantizeState.interval = 99 as any;
    quantizeState.bar = 2000;
    const data: any = { CHAT: make(120, 4, true) };
    setQuantize(data);
    // 同値ブランチ: interval=null になる
    expect(quantizeState.interval).toBeNull();
  });

  test("interval が立っていて bar が異なる場合は既存 clear → 新規 setInterval", () => {
    const oldId = 123 as any;
    quantizeState.interval = oldId;
    quantizeState.bar = 1000; // 異なる
    const data: any = { CHAT: make(60, 4, true) };
    setQuantize(data);
    // 新たな interval が立つ
    expect(quantizeState.interval).not.toBeNull();
    expect(quantizeState.interval).not.toBe(oldId);
  });

  test("複数 stream を処理し、最後の stream の bpm/beat が結果に残る", () => {
    const data: any = {
      CHAT: make(120, 4, true),
      PLAYBACK: make(60, 8, false),
    };
    const result = setQuantize(data);
    expect(result.stream).toEqual(["CHAT", "PLAYBACK"]);
    // 最後の stream で上書き
    expect(result.beat).toBe(8);
    expect(result.bar).toBe(4000); // 60000/60*4
    expect(result.flag).toBe(false);
  });
});
