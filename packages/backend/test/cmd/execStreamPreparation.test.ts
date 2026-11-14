import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  execStreamMock,
  chatPreparationMock,
  recordEmitMock,
  voiceEmitMock,
} = vi.hoisted(() => ({
  execStreamMock: vi.fn(),
  chatPreparationMock: vi.fn(),
  recordEmitMock: vi.fn(),
  voiceEmitMock: vi.fn(),
}));

vi.mock("../../src/stream/chatPreparation", () => ({
  chatPreparation: chatPreparationMock,
}));
vi.mock("../../src/stream/recordEmit", () => ({
  recordEmit: recordEmitMock,
}));
vi.mock("../../src/socket/ioEmit", () => ({
  voiceEmit: voiceEmitMock,
}));
vi.mock("../../src/stream/execStream", () => ({
  execStream: execStreamMock,
}));
vi.mock("../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));
vi.mock("../../src/state", () => ({
  clientState: {
    client: {
      c1: { stream: true },
      c2: { stream: true },
      noStream: { stream: false },
    },
  },
  streamState: {
    target: {} as Record<string, string[]>,
  },
}));

import { execStreamPreparation } from "../../src/cmd/execStreamPreparation";
import { streamState } from "../../src/state";

describe("execStreamPreparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamState.target = {};
  });

  test("forcedTarget を target 配列と execStream の宛先に反映する", async () => {
    await execStreamPreparation(
      "PLAYBACK",
      "requester",
      3,
      "from",
      undefined,
      "c1",
    );

    expect(streamState.target.PLAYBACK).toEqual(["c1"]);
    expect(execStreamMock).toHaveBeenCalledWith(
      "PLAYBACK",
      "from",
      undefined,
      3,
      "c1",
    );
  });

  test("targetId が1件なら自動的に強制宛先にする", async () => {
    await execStreamPreparation(
      "PLAYBACK",
      "requester",
      undefined,
      undefined,
      ["c2"],
    );

    expect(streamState.target.PLAYBACK).toEqual(["c2"]);
    expect(execStreamMock).toHaveBeenCalledWith(
      "PLAYBACK",
      undefined,
      undefined,
      undefined,
      "c2",
    );
  });

  test("target 未指定なら stream client を target 配列へ追加する", async () => {
    await execStreamPreparation("PLAYBACK", "requester");

    expect(streamState.target.PLAYBACK).toEqual(["c1", "c2"]);
    expect(execStreamMock).toHaveBeenCalledWith(
      "PLAYBACK",
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
});
