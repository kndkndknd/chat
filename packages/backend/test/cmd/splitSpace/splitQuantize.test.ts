import { expect, test } from "vitest";
import { splitQuantize } from "../../../src/stream/quantize/splitQuantize";
import { getTypeArr } from "../../../src/cmd/splitSpace/getTypeArr";

test("splitQuantize", async () => {
  // ターゲットについてはtargetに入ってる。下記targetを除いたstringArr
  // stringArr.length === 1 => quantizeCmd(io, state, "all", target, 0);
  // stringArr.length === 2 && 1つめがnumber === "number" => quantizeCmd(io, state, "all", target, Number(stringArr[1]));
  // stringArr.length === 2 && 1つめがstringでstream => quantizeCmd(io, state, stringArr[2], target, 0);
  // stringArr.length === 3 && 1つめがnumberで2つ目がstream  => quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
  // stringArr.length === 3 && 1つめがstreamで2つ目がnumber => quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));

  const stringArr = ["QUANTIZE", "4", "CHAT"];
  const arrTypeArr = getTypeArr(stringArr);
  // quantizeState.bpm.CHAT = { target: 60 };

  const result = await splitQuantize(stringArr, arrTypeArr, "target");
  console.log(result);
  expect(result).toEqual({
    flag: true,
    stream: "CHAT",
    bpm: 60,
    bar: 4000,
    beat: 4,
  });
});
