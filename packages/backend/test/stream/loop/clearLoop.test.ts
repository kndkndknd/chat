import { beforeEach, describe, expect, test, vi } from "vitest";

const { loopClearEmitMock } = vi.hoisted(() => ({
  loopClearEmitMock: vi.fn(),
}));

vi.mock("../../../src/state", () => ({
  streamState: {
    loop: {} as Record<string, string[]>,
  },
}));
vi.mock("../../../src/socket/ioEmit", () => ({
  loopClearEmit: loopClearEmitMock,
}));

import { clearLoop } from "../../../src/stream/loop/clearLoop";
import { streamState } from "../../../src/state";

describe("clearLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamState.loop = {
      CHAT: ["c1"],
      PLAYBACK: ["p1", "p2"],
    };
  });

  test("全ストリームの LOOP を解除し、対象端末へ通知する", () => {
    clearLoop();

    expect(streamState.loop).toEqual({ CHAT: [], PLAYBACK: [] });
    expect(loopClearEmitMock).toHaveBeenCalledWith("CHAT", "c1");
    expect(loopClearEmitMock).toHaveBeenCalledWith("PLAYBACK", "p1");
    expect(loopClearEmitMock).toHaveBeenCalledWith("PLAYBACK", "p2");
  });

  test("指定ストリームだけを解除する", () => {
    clearLoop("PLAYBACK");

    expect(streamState.loop).toEqual({
      CHAT: ["c1"],
      PLAYBACK: [],
    });
    expect(loopClearEmitMock).toHaveBeenCalledTimes(2);
    expect(loopClearEmitMock).not.toHaveBeenCalledWith("CHAT", "c1");
  });

  test("旧スキーマの loop:boolean は空オブジェクトへ移行する", () => {
    (streamState as any).loop = true;

    clearLoop();

    expect(streamState.loop).toEqual({
      CHAT: [],
      PLAYBACK: [],
      TIMELAPSE: [],
    });
    expect(loopClearEmitMock).not.toHaveBeenCalled();
  });
});
