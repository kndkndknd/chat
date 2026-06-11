import { describe, expect, test } from "vitest";
import { cmdSelect } from "../../src/route";

describe("cmdSelect", () => {
  test("strings がリストにマッチしない場合、cmd は初期 {cmd:''}, flag は false", () => {
    const statusList = { cmd: { list: { BASS: "BASS" }, now: { BASS: false } } };
    expect(cmdSelect("UNKNOWN", statusList)).toEqual({
      cmd: { cmd: "" },
      flag: false,
    });
  });

  test("マッチしかつ now[cmd] が false なら flag=true で overlay 付きの cmd", () => {
    const statusList = { cmd: { list: { BASS: "BASS" }, now: { BASS: false } } };
    expect(cmdSelect("BASS", statusList)).toEqual({
      cmd: { cmd: "BASS", overlay: true },
      flag: true,
    });
  });

  test("マッチしかつ now[cmd] が true なら flag=false", () => {
    const statusList = { cmd: { list: { BASS: "BASS" }, now: { BASS: true } } };
    expect(cmdSelect("BASS", statusList)).toEqual({
      cmd: { cmd: "BASS", overlay: true },
      flag: false,
    });
  });
});
