import { beforeEach, describe, expect, test, vi } from "vitest";

const { chatReceiveMock } = vi.hoisted(() => ({
  chatReceiveMock: vi.fn(),
}));

vi.mock("../../../src/stream/chatReceive", () => ({
  chatReceive: chatReceiveMock,
}));
vi.mock("../../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
  streamsRedis: {
    push: vi.fn(),
    incrementIndex: vi.fn(),
    hasKey: vi.fn(),
    initKey: vi.fn(),
  },
}));
vi.mock("../../../src/stream/pushStateStream", () => ({
  pushStateStream: vi.fn(),
}));
vi.mock("../../../src/state", () => ({
  streamState: { basisBufferSize: 8192 },
}));

import { workletBufferFromClient } from "../../../src/stream/audioWorklet/workletBufferFromClient";

describe("workletBufferFromClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("CHAT は byteLength ではなく frames 数を bufferSize にする", async () => {
    const frames = 8192;
    const audio = new Float32Array(frames).buffer;

    await workletBufferFromClient(
      { video: "", audio, source: "CHAT", bufferSize: frames },
      "client-1",
    );

    expect(chatReceiveMock).toHaveBeenCalledTimes(1);
    const buff = chatReceiveMock.mock.calls[0][0];
    expect(buff.bufferSize).toBe(frames);
    expect(buff.duration).toBeCloseTo(frames / 44100);
  });

  test("許可されていない source は拒否する", async () => {
    await workletBufferFromClient(
      {
        video: "",
        audio: new Float32Array(8192).buffer,
        source: "UNKNOWN",
        bufferSize: 8192,
      },
      "client-1",
    );

    expect(chatReceiveMock).not.toHaveBeenCalled();
  });
});
