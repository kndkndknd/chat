import { expect, test } from "vitest";
import { quantizeCmd } from "../../src/stream/quantizeCmd";
import { quantizeState } from "../../src/state";

test("quantize", () => {
  const streamTarget = "CHAT";
  const clientTarget = "test";
  const beat = 0;
  quantizeState.bpm[streamTarget]["test"] = 60;

  const result = quantizeCmd(streamTarget, clientTarget, beat);
  // console.log(result);
  expect(result).toEqual({
    flag: true,
    stream: "CHAT",
    bpm: 60,
    bar: 4000,
    beat: 0,
  });
});
