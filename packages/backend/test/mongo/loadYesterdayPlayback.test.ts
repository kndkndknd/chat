import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Binary } from "mongodb";

type Doc = {
  source?: string;
  audio?: unknown;
  video?: string;
  bufferSize?: number;
  duration?: number;
  from?: string;
  floating?: boolean;
  filter?: unknown;
  timestamp?: number;
  recordIndex?: number;
};

const {
  docsRef,
  toArray,
  find,
  collection,
  getMongoDb,
  clear,
  initKey,
  pushBatch,
  pushStateStream,
  streamList,
} = vi.hoisted(() => {
  const docsRef: { current: Doc[] } = { current: [] };
  const toArray = vi.fn(async () => docsRef.current);
  const find = vi.fn(() => ({ toArray }));
  const collection = vi.fn(() => ({ find }));
  const getMongoDb = vi.fn(async () => ({ collection }));
  const clear = vi.fn(async () => undefined);
  const initKey = vi.fn(async () => undefined);
  const pushBatch = vi.fn(async () => undefined);
  const pushStateStream = vi.fn();
  const streamList: string[] = [];
  return {
    docsRef,
    toArray,
    find,
    collection,
    getMongoDb,
    clear,
    initKey,
    pushBatch,
    pushStateStream,
    streamList,
  };
});

vi.mock("../../src/mongo/client", () => ({ getMongoDb }));
vi.mock("../../src/redis/streamsRedis", () => ({
  streamsRedis: { clear, initKey, pushBatch },
}));
vi.mock("../../src/data", () => ({ streamList }));
vi.mock("../../src/stream/pushStateStream", () => ({ pushStateStream }));

import { loadYesterdayPlayback } from "../../src/mongo/loadYesterdayPlayback";

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  docsRef.current = [];
  toArray.mockClear();
  find.mockClear();
  collection.mockClear();
  getMongoDb.mockClear();
  clear.mockClear();
  initKey.mockClear();
  pushBatch.mockClear();
  pushStateStream.mockClear();
  streamList.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loadYesterdayPlayback", () => {
  test("該当ドキュメントが無いとき 0 を返し redis を触らない", async () => {
    docsRef.current = [];

    const n = await loadYesterdayPlayback();

    expect(n).toBe(0);
    expect(collection).toHaveBeenCalledWith("PLAYBACK");
    expect(clear).not.toHaveBeenCalled();
    expect(pushBatch).not.toHaveBeenCalled();
    expect(pushStateStream).not.toHaveBeenCalled();
  });

  test("yStart/tStart の範囲で PLAYBACK を find する", async () => {
    vi.useFakeTimers();
    // 2026-05-27 10:00:00.000 UTC
    const now = Date.UTC(2026, 4, 27, 10, 0, 0);
    vi.setSystemTime(new Date(now));
    docsRef.current = [];

    await loadYesterdayPlayback();

    const yStart = new Date(now);
    yStart.setDate(yStart.getDate() - 1);
    yStart.setHours(0, 0, 0, 0);
    const tStart = new Date(now);
    tStart.setHours(0, 0, 0, 0);
    expect(find).toHaveBeenCalledWith({
      timestamp: { $gte: yStart.getTime(), $lt: tStart.getTime() },
    });
  });

  test("closest doc に recordIndex が無ければ 0 を返す", async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    vi.setSystemTime(new Date(now));
    const target = now - DAY_MS;
    docsRef.current = [{ timestamp: target, audio: Buffer.from([1]) }];

    const n = await loadYesterdayPlayback();

    expect(n).toBe(0);
    expect(pushBatch).not.toHaveBeenCalled();
  });

  test("target に最も近い doc の recordIndex で抽出し timestamp 昇順に並ぶ", async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    vi.setSystemTime(new Date(now));
    const target = now - DAY_MS;

    docsRef.current = [
      { timestamp: target - 50, recordIndex: 1, audio: Buffer.from([0x10]) },
      { timestamp: target - 10, recordIndex: 2, audio: Buffer.from([0x20]) },
      { timestamp: target - 5, recordIndex: 2, audio: Buffer.from([0x21]) },
      { timestamp: target + 20, recordIndex: 2, audio: Buffer.from([0x22]) },
      { timestamp: target + 500, recordIndex: 3, audio: Buffer.from([0x30]) },
    ];

    const n = await loadYesterdayPlayback();

    expect(n).toBe(3);
    expect(clear).toHaveBeenCalledWith("YESTERDAY");
    expect(initKey).toHaveBeenCalledWith("YESTERDAY");
    expect(pushStateStream).toHaveBeenCalledWith("YESTERDAY");

    const [name, buffs] = pushBatch.mock.calls[0] as [string, unknown[]];
    expect(name).toBe("YESTERDAY");
    expect(buffs).toHaveLength(3);
    const timestamps = (buffs as { timestamp: number }[]).map((b) => b.timestamp);
    expect(timestamps).toEqual([target - 10, target - 5, target + 20]);
    expect((buffs as { source: string }[])[0].source).toBe("YESTERDAY");
  });

  test("streamList に YESTERDAY が既に含まれていれば pushStateStream は呼ばれない", async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    vi.setSystemTime(new Date(now));
    const target = now - DAY_MS;
    docsRef.current = [{ timestamp: target, recordIndex: 1, audio: Buffer.from([1]) }];
    streamList.push("YESTERDAY");

    await loadYesterdayPlayback();

    expect(pushStateStream).not.toHaveBeenCalled();
  });

  test("audio が Buffer / Binary / ArrayBuffer / 不正値 でも ArrayBuffer に正規化される", async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 4, 27, 12, 0, 0);
    vi.setSystemTime(new Date(now));
    const target = now - DAY_MS;

    const ab = new Uint8Array([0xaa, 0xbb]).buffer;
    docsRef.current = [
      { timestamp: target, recordIndex: 9, audio: Buffer.from([0x01, 0x02]) },
      { timestamp: target + 1, recordIndex: 9, audio: new Binary(Buffer.from([0x03])) },
      { timestamp: target + 2, recordIndex: 9, audio: ab },
      { timestamp: target + 3, recordIndex: 9, audio: "junk" },
    ];

    await loadYesterdayPlayback();

    const [, buffs] = pushBatch.mock.calls[0] as [string, { audio: ArrayBuffer }[]];
    expect(buffs[0].audio).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffs[0].audio)).toEqual(new Uint8Array([0x01, 0x02]));
    expect(buffs[1].audio).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffs[1].audio)).toEqual(new Uint8Array([0x03]));
    expect(buffs[2].audio).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(buffs[2].audio)).toEqual(new Uint8Array([0xaa, 0xbb]));
    expect(buffs[3].audio).toBeInstanceOf(ArrayBuffer);
    expect((buffs[3].audio as ArrayBuffer).byteLength).toBe(0);
  });
});
