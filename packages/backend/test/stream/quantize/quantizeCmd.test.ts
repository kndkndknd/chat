import { expect, test } from "vitest";
import { quantizeCmd } from "../../../src/stream/quantize/quantizeCmd";
import { bpmStreamStateType, bpmClientStateType } from "../../../../../types";
import { bpmState } from "../../../src/state";

test("quantizeCmd", () => {
  const streamTarget = "CHAT";
  const clientTarget = "testClient";
  const parameter = { beat: 6, bpm: 120, flag: true };

  const bpmStateObj: bpmClientStateType = {
    METRONOME: {
      bpm: 60,
      beat: 4,
      flag: true,
    },
    MODULATION: {
      flag: false,
      bpm: 60,
      beat: 4,
    },
    stream: {
      CHAT: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: false,
        latency: 60000 / 60 / 4,
      },
    },
  };
  bpmState[clientTarget] = bpmStateObj as bpmClientStateType;
  console.log("bpmState after set: ", bpmState);

  const result: { [client: string]: bpmStreamStateType } = quantizeCmd(
    { streamTarget, clientTarget },
    parameter
  );
  // console.log(result);
  expect(result).toEqual({
    testClient: {
      CHAT: {
        bpm: 120,
        beat: 6,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / parameter.bpm / parameter.beat,
      },
    },
  });
});
