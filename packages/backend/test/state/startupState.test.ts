import { beforeEach, describe, expect, test } from "vitest";
import { currentState, previousState } from "../../src/state";
import { resetRuntimeStreamState } from "../../src/state/startupState";

describe("resetRuntimeStreamState", () => {
  beforeEach(() => {
    currentState.stream = {
      CHAT: true,
      PLAYBACK: true,
      TIMELAPSE: false,
      UPLOAD: true,
    };
    currentState.RECORD = true;
    currentState.WHOLE = true;
    previousState.stream = {
      CHAT: true,
      PLAYBACK: true,
      TIMELAPSE: false,
      UPLOAD: true,
    };
    previousState.RECORD = true;
  });

  test("currentState の再生フラグと RECORD / WHOLE を初期化する", () => {
    resetRuntimeStreamState();

    expect(currentState.stream).toEqual({
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
      UPLOAD: false,
    });
    expect(currentState.RECORD).toBe(false);
    expect(currentState.WHOLE).toBe(false);
  });

  test("previousState の再生フラグと RECORD も初期化する", () => {
    resetRuntimeStreamState();

    expect(previousState.stream).toEqual({
      CHAT: false,
      PLAYBACK: false,
      TIMELAPSE: false,
      UPLOAD: false,
    });
    expect(previousState.RECORD).toBe(false);
  });
});
