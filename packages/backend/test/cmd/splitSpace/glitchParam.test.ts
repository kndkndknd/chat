import { describe, expect, test } from "vitest";

import { glitchParam } from "../../../src/cmd/splitSpace/glitchParam";

const glitchKeys = ["CHAT", "PLAYBACK", "TIMELAPSE"];

describe("glitchParam", () => {
  test("ON / TRUE は全指定 (value: 1)", () => {
    expect(glitchParam("ON", glitchKeys)).toEqual({ value: 1 });
    expect(glitchParam("TRUE", glitchKeys)).toEqual({ value: 1 });
  });

  test("glitch キー指定時はそのキーのトグル (property)", () => {
    expect(glitchParam("CHAT", glitchKeys)).toEqual({ property: "CHAT" });
    expect(glitchParam("PLAYBACK", glitchKeys)).toEqual({
      property: "PLAYBACK",
    });
    expect(glitchParam("TIMELAPSE", glitchKeys)).toEqual({
      property: "TIMELAPSE",
    });
  });

  test("OFF / FALSE / 不明な文字列は全解除 (value: 0)", () => {
    expect(glitchParam("OFF", glitchKeys)).toEqual({ value: 0 });
    expect(glitchParam("FALSE", glitchKeys)).toEqual({ value: 0 });
    expect(glitchParam("UNKNOWN", glitchKeys)).toEqual({ value: 0 });
  });

  test("引数なしは全解除 (value: 0)", () => {
    expect(glitchParam(undefined, glitchKeys)).toEqual({ value: 0 });
  });

  test("小文字のキーはトグル扱いしない", () => {
    expect(glitchParam("chat", glitchKeys)).toEqual({ value: 0 });
  });
});
