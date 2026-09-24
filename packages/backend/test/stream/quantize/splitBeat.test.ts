import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

vi.mock("../../../src/state/states/bpmState", () => ({
  bpmState: {} as Record<string, any>,
}));

vi.mock("../../../src/state/states/ioState", () => ({
  ioState: { io: null as any },
}));

import { splitBeat, emitSplitBeat } from "../../../src/stream/quantize/splitBeat";
import { bpmState } from "../../../src/state/states/bpmState";
import { ioState } from "../../../src/state/states/ioState";

const stream = (beat: number) => ({ beat, gridFlag: false, quantizeFlag: false });

const setupBpmState = () => {
  for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  (bpmState as any).c1 = {
    bpm: 60,
    stream: { PLAYBACK: stream(4), TIMELAPSE: stream(4), EMPTY: stream(4) },
  };
  (bpmState as any).c2 = {
    bpm: 60,
    stream: { PLAYBACK: stream(4), TIMELAPSE: stream(4), EMPTY: stream(4) },
  };
};

let emitMock: ReturnType<typeof vi.fn>;
let toEmitMock: ReturnType<typeof vi.fn>;
let toMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setupBpmState();
  emitMock = vi.fn();
  toEmitMock = vi.fn();
  toMock = vi.fn(() => ({ emit: toEmitMock }));
  (ioState as any).io = { emit: emitMock, to: toMock };
});

describe("emitSplitBeat", () => {
  test("target 指定時は対象クライアントにのみ送信し、ブロードキャストしない", () => {
    emitSplitBeat({ target: "c1" });
    expect(toMock).toHaveBeenCalledWith("c1");
    expect(toMock).not.toHaveBeenCalledWith("c2");
    expect(toEmitMock).toHaveBeenCalledWith("quantizeParamFromServer", {
      data: bpmState.c1.stream,
      stream: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
    });
    expect(emitMock).not.toHaveBeenCalled();
  });

  test("stream 指定時は対象ストリームのみ送信する", () => {
    emitSplitBeat({ target: "c1", stream: "PLAYBACK" });
    expect(toEmitMock).toHaveBeenCalledWith("quantizeParamFromServer", {
      data: bpmState.c1.stream,
      stream: ["PLAYBACK"],
    });
  });

  test("target 未指定時は各クライアントへ個別送信し、ブロードキャストしない", () => {
    emitSplitBeat();
    expect(toMock).toHaveBeenCalledWith("c1");
    expect(toMock).toHaveBeenCalledWith("c2");
    expect(emitMock).not.toHaveBeenCalled();
  });
});

describe("splitBeat", () => {
  test("target 指定時は対象の beat のみ変更し、対象へ送信する", () => {
    splitBeat(16, { target: "c1" });
    expect(bpmState.c1.stream.PLAYBACK.beat).toBe(16);
    expect(bpmState.c1.stream.TIMELAPSE.beat).toBe(16);
    expect(bpmState.c2.stream.PLAYBACK.beat).toBe(4);
    expect(bpmState.c2.stream.TIMELAPSE.beat).toBe(4);
    expect(toMock).toHaveBeenCalledWith("c1");
    expect(toMock).not.toHaveBeenCalledWith("c2");
    expect(emitMock).not.toHaveBeenCalled();
  });

  test("target + stream 指定時は対象クライアントの対象ストリームのみ変更する", () => {
    splitBeat(16, { target: "c1", stream: "PLAYBACK" });
    expect(bpmState.c1.stream.PLAYBACK.beat).toBe(16);
    expect(bpmState.c1.stream.TIMELAPSE.beat).toBe(4);
    expect(bpmState.c2.stream.PLAYBACK.beat).toBe(4);
    expect(toEmitMock).toHaveBeenCalledWith("quantizeParamFromServer", {
      data: bpmState.c1.stream,
      stream: ["PLAYBACK"],
    });
  });

  test("target 未指定時は全クライアントの beat を変更し各クライアントへ送信する", () => {
    splitBeat(8);
    for (const client of ["c1", "c2"]) {
      for (const s of ["PLAYBACK", "TIMELAPSE", "EMPTY"]) {
        expect((bpmState as any)[client].stream[s].beat).toBe(8);
      }
    }
    expect(toMock).toHaveBeenCalledWith("c1");
    expect(toMock).toHaveBeenCalledWith("c2");
    expect(emitMock).not.toHaveBeenCalled();
  });

  test("RANDOM は beat 0 として扱う", () => {
    splitBeat("RANDOM", { target: "c1" });
    expect(bpmState.c1.stream.PLAYBACK.beat).toBe(0);
    expect(bpmState.c2.stream.PLAYBACK.beat).toBe(4);
  });
});
