import { describe, expect, test, vi, beforeEach } from "vitest";

const { stateMock, streamList } = vi.hoisted(() => {
  const streamList: string[] = [];
  return {
    streamList,
    stateMock: {
      streamState: {
        random: {} as Record<string, boolean>,
        target: {} as Record<string, string[]>,
        filter: {} as Record<string, unknown>,
        pa: {} as Record<string, boolean>,
      },
      currentState: { stream: {} as Record<string, boolean> },
      previousState: { stream: {} as Record<string, boolean> },
      sampleRateState: {
        sampleRate: {} as Record<string, number>,
        randomrate: {} as Record<string, boolean>,
        randomratemode: "random" as string,
        randomraterange: {} as Record<string, { min: number; max: number }>,
      },
      glitchState: { glitch: {} as Record<string, boolean> },
      clientState: { client: {} as Record<string, unknown> },
      bpmState: {
        c1: { stream: {} as Record<string, any> },
        c2: { stream: {} as Record<string, any> },
      },
      defaultFilterState: { default: true },
    },
  };
});

vi.mock("../../src/state", () => stateMock);
vi.mock("../../src/data", () => ({ streamList }));

import { pushStateStream } from "../../src/stream/pushStateStream";

describe("pushStateStream", () => {
  beforeEach(() => {
    streamList.length = 0;
    stateMock.bpmState.c1.stream = {};
    stateMock.bpmState.c2.stream = {};
    stateMock.streamState.random = {};
    stateMock.streamState.target = {};
    stateMock.streamState.filter = {};
    stateMock.streamState.pa = {};
    stateMock.currentState.stream = {};
    stateMock.previousState.stream = {};
    stateMock.sampleRateState.sampleRate = {};
    stateMock.sampleRateState.randomrate = {};
    stateMock.sampleRateState.randomratemode = "random";
    stateMock.sampleRateState.randomraterange = {};
    stateMock.glitchState.glitch = {};
  });

  test("新しい stream を streamList と bpmState に追加する", () => {
    pushStateStream("UPLOADED");

    expect(streamList).toEqual(["UPLOADED"]);
    expect(stateMock.bpmState.c1.stream.UPLOADED).toEqual({
      beat: 0,
      gridFlag: true,
      quantizeFlag: false,
    });
    expect(stateMock.bpmState.c2.stream.UPLOADED).toEqual({
      beat: 0,
      gridFlag: true,
      quantizeFlag: false,
    });
  });

  test("既存 stream の QUANTIZE / BEAT 設定を保持し、重複追加しない", () => {
    pushStateStream("UPLOADED");
    stateMock.bpmState.c1.stream.UPLOADED.beat = 8;
    stateMock.bpmState.c1.stream.UPLOADED.quantizeFlag = true;

    pushStateStream("UPLOADED");

    expect(streamList).toEqual(["UPLOADED"]);
    expect(stateMock.bpmState.c1.stream.UPLOADED).toEqual({
      beat: 8,
      gridFlag: true,
      quantizeFlag: true,
    });
  });

  test("新規ストリームは既定値で初期化され、現在のモードを継承する", () => {
    stateMock.sampleRateState.randomratemode = "uniform";

    pushStateStream("NEW");

    expect(stateMock.sampleRateState.sampleRate.NEW).toBe(44100);
    expect(stateMock.sampleRateState.randomrate.NEW).toBe(false);
    expect(stateMock.sampleRateState.randomraterange.NEW).toEqual({
      min: 4000,
      max: 132300,
    });
    expect(stateMock.sampleRateState.randomratemode).toBe("uniform");
  });

  test("既存ストリームの randomrate / range / sampleRate / mode を保持する", () => {
    pushStateStream("UPLOADED");
    stateMock.sampleRateState.randomrate.UPLOADED = true;
    stateMock.sampleRateState.randomraterange.UPLOADED = {
      min: 8000,
      max: 22050,
    };
    stateMock.sampleRateState.sampleRate.UPLOADED = 22050;
    stateMock.sampleRateState.randomratemode = "uniform";
    stateMock.currentState.stream.UPLOADED = true;

    pushStateStream("UPLOADED");

    expect(stateMock.sampleRateState.randomrate.UPLOADED).toBe(true);
    expect(stateMock.sampleRateState.randomraterange.UPLOADED).toEqual({
      min: 8000,
      max: 22050,
    });
    expect(stateMock.sampleRateState.sampleRate.UPLOADED).toBe(22050);
    expect(stateMock.sampleRateState.randomratemode).toBe("uniform");
    expect(stateMock.currentState.stream.UPLOADED).toBe(true);
  });
});
