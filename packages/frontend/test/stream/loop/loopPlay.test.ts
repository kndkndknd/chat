import { beforeEach, describe, expect, test, vi } from "vitest";

const { streamPlayMock } = vi.hoisted(() => ({
  streamPlayMock: vi.fn(),
}));

vi.mock("../../../src/stream/play/streamPlay", () => ({
  streamPlay: streamPlayMock,
}));

import { loopPlay } from "../../../src/stream/loop/loopPlay";
import {
  loopChunk,
  streamFlagState,
  streamState,
} from "../../../src/state";

describe("loopPlay", () => {
  const chunk = {
    audio: new Float32Array(1),
    sampleRate: 44100,
    glitch: false,
    bufferSize: 8192,
    source: "PLAYBACK",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(streamState.loop)) {
      streamState.loop[key] = [];
    }
    for (const key of Object.keys(loopChunk)) {
      loopChunk[key] = null;
    }
    for (const key of Object.keys(streamFlagState)) {
      streamFlagState[key] = false;
    }
  });

  test("LOOP 対象でも streamFlagState が false なら再生しない", () => {
    streamState.loop.PLAYBACK = ["client"];
    loopChunk.PLAYBACK = chunk;

    loopPlay();

    expect(streamPlayMock).not.toHaveBeenCalled();
  });

  test("LOOP 対象かつ streamFlagState が true なら再生する", () => {
    streamState.loop.PLAYBACK = ["client"];
    loopChunk.PLAYBACK = chunk;
    streamFlagState.PLAYBACK = true;

    loopPlay();

    expect(streamPlayMock).toHaveBeenCalledWith("STREAM", chunk);
  });
});
