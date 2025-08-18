import { expect, test } from "vitest";
import { decideQuantizeFromAverage } from "../../../src/stream/quantize/decideQuantizeFromAverage";
import { bpmState } from "../../../src/state";

test("quantize", () => {
  const streamArr = ["PLAYBACK"];
  const clientArr = ["testId", "testId2"];
  bpmState["testId"] = {
    METRONOME: {
      bpm: 60,
      beat: 4,
      flag: false,
    },
    MODULATION: {
      flag: false,
      bpm: 60,
      beat: 4,
    },
    stream: {
      PLAYBACK: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: false,
        latency: 1000,
      },
    },
  };

  bpmState["testId2"] = {
    METRONOME: {
      bpm: 30,
      beat: 2,
      flag: false,
    },
    MODULATION: {
      flag: false,
      bpm: 30,
      beat: 2,
    },
    stream: {
      PLAYBACK: {
        bpm: 30,
        beat: 2,
        gridFlag: false,
        quantizeFlag: false,
        latency: 1000,
      },
    },
  };

  console.log("bpmState", bpmState);

  const result = decideQuantizeFromAverage(
    streamArr,
    clientArr,
    undefined,
    undefined,
    undefined
  );
  // console.log(result);
  expect(result).toEqual({
    flag: true,
    bpm: 45,
    bar: (4 * 60000) / 45,
    beat: 3,
  });
});
