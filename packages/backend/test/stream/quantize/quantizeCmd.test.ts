import { expect, test } from "vitest";
import { quantizeCmd } from "../../../src/stream/quantize/quantizeCmd";
import { quantizeState } from "../../../src/state";

test("quantizeCmd", () => {
  const streamTarget = "CHAT";
  const clientTarget = "test";
  const beat = 0;
  quantizeState.bpm[streamTarget]["test"] = 60;

  const result = quantizeCmd(streamTarget, clientTarget, { beat });
  // console.log(result);
  expect(result).toEqual({
    flag: true,
    stream: "CHAT",
    bpm: 60,
    bar: 4000,
    beat: 0,
  });
});
