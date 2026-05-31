import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { insertMany, collection, getMongoDb, lrange, clear } = vi.hoisted(() => {
  const insertMany = vi.fn(async () => ({ insertedCount: 0 }));
  const collection = vi.fn(() => ({ insertMany }));
  const getMongoDb = vi.fn(async () => ({ collection }));
  const lrange = vi.fn(async (_key: string) => [] as string[]);
  const clear = vi.fn(async () => undefined);
  return { insertMany, collection, getMongoDb, lrange, clear };
});

vi.mock("../../src/mongo/client", () => ({ getMongoDb }));
vi.mock("../../src/redis/client", () => ({ redis: { lrange } }));
vi.mock("../../src/redis/streamsRedis", () => ({
  buffKey: (name: string) => `streams:${name}:buff`,
  streamsRedis: { clear },
}));

import {
  flushStreamToMongo,
  flushPlaybackAndTimelapse,
} from "../../src/mongo/flushStreams";

const makeRaw = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    source: "PLAYBACK",
    audio: Buffer.from(new Uint8Array([1, 2, 3])).toString("base64"),
    video: "",
    bufferSize: 8192,
    duration: 0.1,
    from: "client1",
    floating: false,
    filter: {},
    timestamp: 1700000000000,
    recordIndex: 7,
    ...over,
  });

beforeEach(() => {
  insertMany.mockClear();
  collection.mockClear();
  getMongoDb.mockClear();
  lrange.mockReset();
  clear.mockReset();
  lrange.mockResolvedValue([]);
  clear.mockResolvedValue(undefined as unknown as void);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("flushStreamToMongo", () => {
  test("redis が空のときは insert も clear もせず 0 を返す", async () => {
    lrange.mockResolvedValueOnce([]);

    const n = await flushStreamToMongo("PLAYBACK");

    expect(n).toBe(0);
    expect(getMongoDb).not.toHaveBeenCalled();
    expect(insertMany).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  test("redis にデータがあれば mongo に insertMany し redis をクリアする", async () => {
    lrange.mockResolvedValueOnce([makeRaw(), makeRaw({ timestamp: 1700000001000 })]);

    const n = await flushStreamToMongo("PLAYBACK");

    expect(n).toBe(2);
    expect(lrange).toHaveBeenCalledWith("streams:PLAYBACK:buff", 0, -1);
    expect(collection).toHaveBeenCalledWith("PLAYBACK");
    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledWith("PLAYBACK");
  });

  test("audio は base64 から Buffer に復元され、各フィールドは保存される", async () => {
    const audio = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    lrange.mockResolvedValueOnce([
      makeRaw({
        audio: Buffer.from(audio).toString("base64"),
        source: "TIMELAPSE",
        timestamp: 42,
        from: "c1",
      }),
    ]);

    await flushStreamToMongo("TIMELAPSE");

    const [docs] = insertMany.mock.calls[0] as [unknown[]];
    expect(docs).toHaveLength(1);
    const d = docs[0] as Record<string, unknown>;
    expect(d.source).toBe("TIMELAPSE");
    expect(Buffer.isBuffer(d.audio)).toBe(true);
    expect(Array.from(d.audio as Buffer)).toEqual(Array.from(audio));
    expect(d.timestamp).toBe(42);
    expect(d.from).toBe("c1");
  });

  test("audio が空でも壊れず空 Buffer になる", async () => {
    lrange.mockResolvedValueOnce([makeRaw({ audio: "" })]);

    await flushStreamToMongo("PLAYBACK");

    const [docs] = insertMany.mock.calls[0] as [unknown[]];
    const d = docs[0] as Record<string, unknown>;
    expect(Buffer.isBuffer(d.audio)).toBe(true);
    expect((d.audio as Buffer).length).toBe(0);
  });

  test("recordIndex は doc に保持される", async () => {
    lrange.mockResolvedValueOnce([makeRaw({ recordIndex: 7 })]);

    await flushStreamToMongo("PLAYBACK");

    const [docs] = insertMany.mock.calls[0] as [unknown[]];
    expect((docs[0] as Record<string, unknown>).recordIndex).toBe(7);
  });
});

describe("flushPlaybackAndTimelapse", () => {
  test("PLAYBACK と TIMELAPSE の両方に対して flush を試みる", async () => {
    lrange.mockResolvedValue([]);

    await flushPlaybackAndTimelapse();

    expect(lrange).toHaveBeenNthCalledWith(1, "streams:PLAYBACK:buff", 0, -1);
    expect(lrange).toHaveBeenNthCalledWith(2, "streams:TIMELAPSE:buff", 0, -1);
  });

  test("片方が throw しても残りは継続される", async () => {
    lrange
      .mockRejectedValueOnce(new Error("redis down"))
      .mockResolvedValueOnce([]);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(flushPlaybackAndTimelapse()).resolves.toBeUndefined();

    expect(lrange).toHaveBeenCalledTimes(2);
    err.mockRestore();
  });
});
