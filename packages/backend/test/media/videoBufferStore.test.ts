import { beforeEach, describe, expect, test, vi } from "vitest";
import { redis } from "../../src/redis/client";
import {
  clearVideoBuffer,
  deserializeVideoBuffer,
  getVideoBuffer,
  MAX_VIDEO_BUFFER_BYTES,
  serializeVideoBuffer,
  storeVideoBuffer,
} from "../../src/media/videoBufferStore";

describe("serializeVideoBuffer / deserializeVideoBuffer", () => {
  test("blob (ArrayBuffer) を base64 化し、復元すると元のバイト列と一致する", () => {
    const blob = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const json = serializeVideoBuffer({
      container: "webm",
      mimeType: "video/webm",
      blob,
    });
    const parsed = JSON.parse(json);
    expect(parsed.container).toBe("webm");
    expect(parsed.mimeType).toBe("video/webm");
    expect(parsed.blob).toBe(Buffer.from(blob).toString("base64"));

    const restored = deserializeVideoBuffer(json);
    expect(restored.container).toBe("webm");
    expect(restored.mimeType).toBe("video/webm");
    expect(new Uint8Array(restored.blob)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  test("空の blob でも壊れない", () => {
    const json = serializeVideoBuffer({
      container: "ogg",
      mimeType: "video/ogg",
      blob: new ArrayBuffer(0),
    });
    expect(JSON.parse(json).blob).toBe("");
    expect(deserializeVideoBuffer(json).blob.byteLength).toBe(0);
  });
});

describe("videoBufferStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
  });

  test("storeVideoBuffer は videoBuffer:<container> に保存する", async () => {
    const blob = new Uint8Array([1, 2]).buffer;
    await storeVideoBuffer({ container: "webm", mimeType: "video/webm", blob });
    expect(redis.set).toHaveBeenCalledWith(
      "videoBuffer:webm",
      expect.any(String),
    );
  });

  test("webm / ogg 以外の container は拒否し、保存しない", async () => {
    await expect(
      storeVideoBuffer({
        container: "mp4",
        mimeType: "video/mp4",
        blob: new Uint8Array([1]).buffer,
      }),
    ).rejects.toThrow("invalid video buffer container");
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("上限を超える blob は拒否し、保存しない", async () => {
    await expect(
      storeVideoBuffer({
        container: "webm",
        mimeType: "video/webm",
        blob: new ArrayBuffer(MAX_VIDEO_BUFFER_BYTES + 1),
      }),
    ).rejects.toThrow("too large");
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("getVideoBuffer は webm を優先する", async () => {
    const webmRaw = serializeVideoBuffer({
      container: "webm",
      mimeType: "video/webm",
      blob: new Uint8Array([1]).buffer,
    });
    const oggRaw = serializeVideoBuffer({
      container: "ogg",
      mimeType: "video/ogg",
      blob: new Uint8Array([2]).buffer,
    });
    vi.mocked(redis.get).mockImplementation(async (key) =>
      key === "videoBuffer:webm" ? webmRaw : oggRaw,
    );
    const result = await getVideoBuffer();
    expect(result?.container).toBe("webm");
  });

  test("webm が無ければ ogg を返す", async () => {
    const oggRaw = serializeVideoBuffer({
      container: "ogg",
      mimeType: "video/ogg",
      blob: new Uint8Array([9]).buffer,
    });
    vi.mocked(redis.get).mockImplementation(async (key) =>
      key === "videoBuffer:ogg" ? oggRaw : null,
    );
    const result = await getVideoBuffer();
    expect(result?.container).toBe("ogg");
    expect(new Uint8Array(result!.blob)).toEqual(new Uint8Array([9]));
  });

  test("未保存なら null を返す", async () => {
    expect(await getVideoBuffer()).toBeNull();
  });

  test("clearVideoBuffer は webm / ogg の両キーを削除する", async () => {
    await clearVideoBuffer();
    expect(redis.del).toHaveBeenCalledWith(
      "videoBuffer:webm",
      "videoBuffer:ogg",
    );
  });
});
