import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/socket/ioEmit", () => ({
  stringEmit: vi.fn(),
}));

import { glitchChange } from "../../src/parameterChange/glitchChange";
import { glitchState } from "../../src/state/states/glitchState";
import { stringEmit } from "../../src/socket/ioEmit";

const resetGlitch = () => {
  for (const key of Object.keys(glitchState.glitch)) {
    glitchState.glitch[key] = false;
  }
};

describe("glitchChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGlitch();
  });

  test("property 指定はそのキーだけトグルし、他は変更しない", () => {
    glitchChange({ property: "PLAYBACK" });

    expect(glitchState.glitch.PLAYBACK).toBe(true);
    expect(glitchState.glitch.CHAT).toBe(false);
    expect(glitchState.glitch.TIMELAPSE).toBe(false);
    expect(stringEmit).toHaveBeenCalledWith("GLITCH PLAYBACK: true", true);

    glitchChange({ property: "PLAYBACK" });
    expect(glitchState.glitch.PLAYBACK).toBe(false);
    expect(stringEmit).toHaveBeenLastCalledWith("GLITCH PLAYBACK: false", true);
  });

  test("value: 1 は全キーを true にする", () => {
    glitchChange({ value: 1 });

    for (const key of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[key]).toBe(true);
    }
  });

  test("value: 0 は全キーを false にする", () => {
    glitchChange({ value: 1 });
    glitchChange({ value: 0 });

    for (const key of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[key]).toBe(false);
    }
  });

  test("引数なしは全キーをトグルする（どれか false なら全 true）", () => {
    glitchState.glitch.CHAT = true;

    glitchChange(undefined);

    for (const key of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[key]).toBe(true);
    }

    glitchChange(undefined);

    for (const key of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[key]).toBe(false);
    }
  });
});
