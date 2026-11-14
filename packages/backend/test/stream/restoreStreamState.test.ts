import { beforeEach, describe, expect, test } from "vitest";
import { streamList } from "../../src/data/list/streamList";
import {
  bpmState,
  currentState,
  defaultFilterState,
  glitchState,
  previousState,
  sampleRateState,
  streamState,
} from "../../src/state";
import {
  ensureStreamState,
  restoreStreamListFromKeys,
} from "../../src/stream/restoreStreamState";

const removeStream = (streamName: string) => {
  delete currentState.stream[streamName];
  delete previousState.stream[streamName];
  delete sampleRateState.sampleRate[streamName];
  delete sampleRateState.randomrate[streamName];
  delete sampleRateState.randomraterange[streamName];
  delete sampleRateState.randomratenote[streamName];
  delete glitchState.glitch[streamName];
  delete streamState.random[streamName];
  delete streamState.grid[streamName];
  delete streamState.target[streamName];
  delete streamState.filter[streamName];
  delete streamState.pa[streamName];
  delete streamState.loop[streamName];
};

describe("restoreStreamState", () => {
  beforeEach(() => {
    streamList.splice(0, streamList.length, "PLAYBACK", "TIMELAPSE", "EMPTY");
    removeStream("UPLOAD");
    for (const clientId of Object.keys(bpmState)) {
      delete bpmState[clientId];
    }
  });

  test("streams:keys の動的ストリームを streamList と各 state に復元する", () => {
    bpmState.c1 = {
      bpm: 60,
      METRONOME: { beat: 4, flag: false },
      MODULATION: { beat: 4, flag: false },
      TORCH: { beat: 4, flag: false, type: "STEADY" },
      stream: {},
    };

    restoreStreamListFromKeys(["PLAYBACK", "UPLOAD"]);

    expect(streamList).toContain("UPLOAD");
    expect(currentState.stream.UPLOAD).toBe(false);
    expect(previousState.stream.UPLOAD).toBe(false);
    expect(sampleRateState.sampleRate.UPLOAD).toBe(44100);
    expect(sampleRateState.randomrate.UPLOAD).toBe(false);
    expect(sampleRateState.randomraterange.UPLOAD).toEqual({
      min: 4000,
      max: 132300,
    });
    expect(sampleRateState.randomratenote.UPLOAD).toBe(false);
    expect(glitchState.glitch.UPLOAD).toBe(false);
    expect(streamState.random.UPLOAD).toBe(true);
    expect(streamState.grid.UPLOAD).toBe(false);
    expect(streamState.target.UPLOAD).toEqual([]);
    expect(streamState.filter.UPLOAD).toEqual(defaultFilterState);
    expect(streamState.pa.UPLOAD).toBe(false);
    expect(streamState.loop.UPLOAD).toEqual([]);
    expect(bpmState.c1.stream.UPLOAD).toEqual({
      beat: 4,
      gridFlag: false,
      quantizeFlag: false,
    });
  });

  test("Redis から復元済みの値は上書きしない", () => {
    const filter = {
      ...defaultFilterState,
      flag: true,
      frequency: 220,
    };
    sampleRateState.sampleRate.UPLOAD = 22050;
    streamState.random.UPLOAD = false;
    streamState.target.UPLOAD = ["c1"];
    streamState.filter.UPLOAD = filter;

    ensureStreamState("UPLOAD");

    expect(sampleRateState.sampleRate.UPLOAD).toBe(22050);
    expect(streamState.random.UPLOAD).toBe(false);
    expect(streamState.target.UPLOAD).toEqual(["c1"]);
    expect(streamState.filter.UPLOAD).toEqual(filter);
  });

  test("同じストリームを重複登録しない", () => {
    ensureStreamState("UPLOAD");
    ensureStreamState("UPLOAD");

    expect(streamList.filter((name) => name === "UPLOAD")).toHaveLength(1);
  });
});
