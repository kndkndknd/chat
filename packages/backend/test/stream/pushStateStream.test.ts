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
});
