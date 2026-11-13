import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { recordReqFromServer } from "../../../src/stream/socketFromServer/recordReqFromServer";
import { audioWorkletState } from "../../../src/state";

describe("recordReqFromServer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    audioWorkletState.chat.flag.PLAYBACK = false;
    audioWorkletState.chat.recordIndex.PLAYBACK = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("古い録画タイマーが新しい録画フラグを落とさない", () => {
    recordReqFromServer({
      source: "PLAYBACK",
      timeout: 1000,
      index: 1,
    });
    expect(audioWorkletState.chat.flag.PLAYBACK).toBe(true);
    expect(audioWorkletState.chat.recordIndex.PLAYBACK).toBe(1);

    vi.advanceTimersByTime(600);
    recordReqFromServer({
      source: "PLAYBACK",
      timeout: 1000,
      index: 2,
    });

    // 1回目のタイマーが発火する時刻を過ぎても、2回目の録画は継続する。
    vi.advanceTimersByTime(600);
    expect(audioWorkletState.chat.flag.PLAYBACK).toBe(true);
    expect(audioWorkletState.chat.recordIndex.PLAYBACK).toBe(2);

    vi.advanceTimersByTime(400);
    expect(audioWorkletState.chat.flag.PLAYBACK).toBe(false);
  });

  test("不正な timeout は無視する", () => {
    recordReqFromServer({ source: "PLAYBACK", timeout: 0 });

    expect(audioWorkletState.chat.flag.PLAYBACK).toBe(false);
  });
});
