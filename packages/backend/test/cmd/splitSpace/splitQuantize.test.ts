import { expect, test } from "vitest";
import { splitQuantize } from "../../../src/cmd/splitSpace/splitQuantize";
import { states } from "../../../src/states";
import { getTypeArr } from "../../../src/cmd/splitSpace/getTypeArr";
import { get } from "http";

test("getScheduleFromJson", async () => {
  // ターゲットについてはtargetに入ってる。下記targetを除いたstringArr
  // stringArr.length === 1 => quantizeCmd(io, state, "all", target, 0);
  // stringArr.length === 2 && 1つめがnumber === "number" => quantizeCmd(io, state, "all", target, Number(stringArr[1]));
  // stringArr.length === 2 && 1つめがstringでstream => quantizeCmd(io, state, stringArr[2], target, 0);
  // stringArr.length === 3 && 1つめがnumberで2つ目がstream  => quantizeCmd(io, state, stringArr[3], target, Number(stringArr[1]));
  // stringArr.length === 3 && 1つめがstreamで2つ目がnumber => quantizeCmd(io, state, stringArr[1], target, Number(stringArr[2]));

  const stringArr = ["CHAT"];
  const arrTypeArr = getTypeArr(stringArr);

  // const log = [
  //   { date: "0000-00-00 00:00:00", cmd: "SCENARIO" },
  //   { date: "0000-00-00 00:00:10", cmd: "440" },
  //   { date: "0000-00-00 00:00:11.123", cmd: "CLICK" },
  //   { date: "0000-00-00 00:02:00", cmd: "STOP" },
  // ];
  const result = await splitQuantize(states, stringArr, arrTypeArr, "target");
  console.log(result);
  expect(result).toEqual({
    flag: true,
    stream: "CHAT",
    bpm: 0,
    bar: 0,
    beat: 0,
  });
});
