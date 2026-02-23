import { expect, test } from "vitest";
import { decideQuantizeFromAverage } from "../../../src/stream/quantize/decideQuantizeFromAverage";
import { bpmState } from "../../../src/state";
import { bpmStreamStateType } from "../../../../../types";

test("decideQuantizeFromAverage1", () => {
  // TODO: bpmStateの初期化
  const bpmStreamState: { [keys: string]: bpmStreamStateType } = {
    client1: {
      STREAM1: {
        bpm: 120,
        beat: 4,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
      STREAM2: {
        bpm: 100,
        beat: 8,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
    },
    client2: {
      STREAM1: {
        bpm: 140,
        beat: 4,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
      STREAM2: {
        bpm: 110,
        beat: 8,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
    },
  };

  const result = decideQuantizeFromAverage(bpmStreamState, {
    bpm: 130,
    beat: 4,
    flag: true,
  });

  expect(result).toEqual({
    client1: {
      STREAM1: {
        bpm: 130,
        beat: 4,
        gridFlag: false,
        latency: 60000 / 130 / 4,
        quantizeFlag: true,
      },
      STREAM2: {
        bpm: 130,
        beat: 4,
        gridFlag: false,
        latency: 60000 / 130 / 4,
        quantizeFlag: true,
      },
    },
    client2: {
      STREAM1: {
        bpm: 130,
        beat: 4,
        gridFlag: false,
        latency: 60000 / 130 / 4,
        quantizeFlag: true,
      },
      STREAM2: {
        bpm: 130,
        beat: 4,
        gridFlag: false,
        latency: 60000 / 130 / 4,
        quantizeFlag: true,
      },
    },
  });
});

test("decideQuantizeFromAverage2", () => {
  // TODO: bpmStateの初期化
  const bpmStreamState: { [keys: string]: bpmStreamStateType } = {
    client1: {
      STREAM1: {
        bpm: 120,
        beat: 4,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
      STREAM2: {
        bpm: 100,
        beat: 8,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
    },
    client2: {
      STREAM1: {
        bpm: 140,
        beat: 4,
        gridFlag: true,
        quantizeFlag: true,
        latency: 0,
      },
      STREAM2: {
        bpm: 110,
        beat: 8,
        gridFlag: true,
        quantizeFlag: false,
        latency: 0,
      },
    },
  };

  const result = decideQuantizeFromAverage(bpmStreamState);

  expect(result).toEqual({
    client1: {
      STREAM1: {
        bpm: 117.5,
        beat: 6,
        gridFlag: false,
        latency: 60000 / 117.5 / 6,
        quantizeFlag: true,
      },
      STREAM2: {
        bpm: 117.5,
        beat: 6,
        gridFlag: false,
        latency: 60000 / 117.5 / 6,
        quantizeFlag: true,
      },
    },
    client2: {
      STREAM1: {
        bpm: 117.5,
        beat: 6,
        gridFlag: false,
        latency: 60000 / 117.5 / 6,
        quantizeFlag: true,
      },
      STREAM2: {
        bpm: 117.5,
        beat: 6,
        gridFlag: false,
        latency: 60000 / 117.5 / 6,
        quantizeFlag: true,
      },
    },
  });
});
