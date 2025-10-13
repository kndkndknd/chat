import { expect, test } from "vitest";
import { quantizeCmd } from "../../../src/stream/quantize/quantizeCmd";
import { bpmStreamStateType, bpmClientStateType } from "../../../../../types";
import { clientState, bpmState } from "../../../src/state";

test("quantizeCmd", () => {
  // const streamTarget = "CHAT";
  // const clientTarget = "testClient";
  // const parameter = { beat: 6, bpm: 120, flag: true };
  const streamTarget = "all";
  const clientTarget = "all";
  const parameter = { beat: 4 };
  // const parameter = { beat: 4, bpm: 50, flag: true };

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

  clientState.client["testClient1"] = {
    ipAddress: "",
    urlPathName: "",
    projection: false,
    stream: false,
    position: {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    },
  };
  clientState.client["testClient2"] = {
    ipAddress: "",
    urlPathName: "",
    projection: false,
    stream: false,
    position: {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    },
  };
  clientState.cmdClient = ["testClient1", "testClient2"];
  clientState.streamClient = ["testClient1", "testClient2"];
  clientState.sinewaveClient = [];

  if (clientTarget === "all") {
    for (const client of Object.keys(clientState.client)) {
      bpmState[client] = bpmStateObj;
    }
  } else {
    bpmState[clientTarget] = bpmStateObj;
  }

  const result: { [client: string]: bpmStreamStateType } = quantizeCmd(
    { streamTarget, clientTarget },
    parameter
  );
  // console.log(result);
  expect(result).toEqual({
    testClient1: {
      CHAT: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      EMPTY: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      PLAYBACK: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      TIMELAPSE: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
    },
    testClient2: {
      CHAT: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      EMPTY: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      PLAYBACK: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
      TIMELAPSE: {
        bpm: 60,
        beat: 4,
        gridFlag: false,
        quantizeFlag: true,
        latency: 60000 / 60 / parameter.beat,
      },
    },
  });
});
