import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  initDefaultKeysMock,
  getAllKeysMock,
  initRecordIndexMock,
  restoreStreamListFromKeysMock,
} = vi.hoisted(() => ({
  initDefaultKeysMock: vi.fn(),
  getAllKeysMock: vi.fn(),
  initRecordIndexMock: vi.fn(),
  restoreStreamListFromKeysMock: vi.fn(),
}));

vi.mock("../../src/redis/streamsRedis", () => ({
  streamsRedis: {
    initDefaultKeys: initDefaultKeysMock,
    getAllKeys: getAllKeysMock,
  },
  chatsRedis: {},
}));
vi.mock("../../src/stream/recordEmit", () => ({
  initRecordIndex: initRecordIndexMock,
}));
vi.mock("../../src/stream/restoreStreamState", () => ({
  restoreStreamListFromKeys: restoreStreamListFromKeysMock,
}));

import { initStreams } from "../../src/data/chunk/streams";

describe("initStreams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllKeysMock.mockResolvedValue([
      "PLAYBACK",
      "TIMELAPSE",
      "INTERNET",
      "EMPTY",
      "CHAT",
      "UPLOAD",
    ]);
  });

  test("保存済みキーから動的ストリームだけを復元する", async () => {
    await initStreams();

    expect(initDefaultKeysMock).toHaveBeenCalledTimes(1);
    expect(restoreStreamListFromKeysMock).toHaveBeenCalledWith([
      "PLAYBACK",
      "TIMELAPSE",
      "EMPTY",
      "UPLOAD",
    ]);
    expect(initRecordIndexMock).toHaveBeenCalledTimes(1);
  });
});
