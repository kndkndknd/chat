import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  pushStateStreamMock,
  getPcmDataMock,
  getImageDataMock,
  redisMock,
  mkdtempMock,
  rmMock,
} = vi.hoisted(() => ({
  pushStateStreamMock: vi.fn(),
  getPcmDataMock: vi.fn(),
  getImageDataMock: vi.fn(),
  redisMock: {
    del: vi.fn(),
    rpush: vi.fn(),
    rename: vi.fn(),
    set: vi.fn(),
  },
  mkdtempMock: vi.fn(),
  rmMock: vi.fn(),
}));

vi.mock("../../../src/stream/pushStateStream", () => ({
  pushStateStream: pushStateStreamMock,
}));
vi.mock("../../../src/stream/uploadModule/getPcmData", () => ({
  promiseGetPcmData: getPcmDataMock,
}));
vi.mock("../../../src/stream/uploadModule/getImageData", () => ({
  promiseGetImageData: getImageDataMock,
}));
vi.mock("../../../src/redis/client", () => ({ redis: redisMock }));
vi.mock("../../../src/redis/streamsRedis", () => ({
  buffKey: (name: string) => `streams:${name}:buff`,
  indexKey: (name: string) => `streams:${name}:index`,
  serializeStream: (buff: unknown) => JSON.stringify(buff),
}));
vi.mock("fs", () => ({
  promises: {
    mkdtemp: mkdtempMock,
    rm: rmMock,
  },
}));

import { uploadVideo } from "../../../src/stream/uploadModule/uploadVideo";

describe("uploadVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdtempMock.mockResolvedValue("/media/upload-test");
    rmMock.mockResolvedValue(undefined);
    getPcmDataMock.mockResolvedValue([new ArrayBuffer(4)]);
    getImageDataMock.mockResolvedValue(["data:image/jpeg;base64,AA=="]);
    redisMock.del.mockResolvedValue(1);
    redisMock.rpush.mockResolvedValue(1);
    redisMock.rename.mockResolvedValue("OK");
    redisMock.set.mockResolvedValue("OK");
  });

  test("区間を逐次処理し、最後に一時キーを本番キーへ置換する", async () => {
    const result = await uploadVideo(
      "video.mp4",
      [
        { ss: "0", t: "20" },
        { ss: "20", t: "20" },
      ],
      "/media",
    );

    expect(result).toBe(true);
    expect(pushStateStreamMock).toHaveBeenCalledWith("video");
    expect(getPcmDataMock).toHaveBeenNthCalledWith(
      1,
      "/media/video.mp4",
      8192,
      { stereo: true, sampleRate: 22050, ss: "0", t: "20" },
    );
    expect(getPcmDataMock).toHaveBeenNthCalledWith(
      2,
      "/media/video.mp4",
      8192,
      { stereo: true, sampleRate: 22050, ss: "20", t: "20" },
    );
    expect(redisMock.rpush).toHaveBeenCalledTimes(2);
    expect(redisMock.rename).toHaveBeenCalledWith(
      "streams:video:buff:upload_tmp",
      "streams:video:buff",
    );
    expect(redisMock.set).toHaveBeenCalledWith(
      "streams:video:index",
      0,
    );
    expect(rmMock).toHaveBeenCalledTimes(2);
  });

  test("抽出に失敗したら本番キーを置換しない", async () => {
    getPcmDataMock.mockRejectedValueOnce(new Error("ffmpeg failed"));

    const result = await uploadVideo(
      "video.mp4",
      [{ ss: "0", t: "20" }],
      "/media",
    );

    expect(result).toBe(false);
    expect(redisMock.rename).not.toHaveBeenCalled();
    expect(redisMock.del).toHaveBeenCalledWith(
      "streams:video:buff:upload_tmp",
    );
  });
});
