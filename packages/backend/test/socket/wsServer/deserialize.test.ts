import { describe, expect, test, vi } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: { client: {}, streamClient: [], cmdClient: [] },
  currentState: { stream: {} },
  bpmState: {},
}));
vi.mock("../../../src/state/states/ioState", () => ({
  ioState: { io: null },
}));
vi.mock("../../../src/stream/chatReceive", () => ({ chatReceive: vi.fn() }));
vi.mock("../../../src/cmd/charProcess", () => ({ charProcess: vi.fn() }));
vi.mock("../../../src/stream/streamEmit", () => ({ streamEmit: vi.fn() }));
vi.mock("../../../src/socket/ioEmit", () => ({ stringEmit: vi.fn() }));
vi.mock("../../../src/clientSetting/connectFromClient", () => ({
  connectFromClient: vi.fn(),
}));
vi.mock("../../../src/clientSetting/clientSettingsEmit", () => ({
  emitClientSettings: vi.fn(),
}));
vi.mock("../../../src/redis/streamsRedis", () => ({
  countersRedis: { increment: vi.fn(async () => 0) },
  streamsRedis: { getLength: vi.fn(async () => 0) },
}));
vi.mock("../../../src/scenario/loadScenario", () => ({
  loadScenario: vi.fn(async () => ({ format: "relative", timetable: {} })),
}));
vi.mock("../../../src/scenario/execScenario", () => ({
  execScenario: vi.fn(),
}));
vi.mock("../../../src/stream/audioWorklet/workletBufferFromClient", () => ({
  workletBufferFromClient: vi.fn(),
}));
vi.mock("../../../src/webRTC/weriftClient", () => ({ feedWebMChunk: vi.fn() }));
vi.mock("../../../src/stream/receiveWholeReq", () => ({
  receiveWholeReq: vi.fn(),
}));

import { deserialize } from "../../../src/socket/wsServer";

describe("deserialize", () => {
  test("通常の JSON は { type, data } として復元される", () => {
    const raw = JSON.stringify({ type: "ping", data: { v: 1 } });
    expect(deserialize(raw)).toEqual({ type: "ping", data: { v: 1 } });
  });

  test("__type=ArrayBuffer のフィールドは元バイト列と完全一致して復元される", () => {
    const audioBytes = new Uint8Array([1, 2, 3]);
    const b64 = Buffer.from(audioBytes).toString("base64");
    const raw = JSON.stringify({
      type: "audio",
      data: { __type: "ArrayBuffer", data: b64 },
    });
    const result = deserialize(raw);
    expect(result.type).toBe("audio");
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    // byteLength は元バイト数と完全一致する（プール残骸が混じってはいけない）
    expect((result.data as ArrayBuffer).byteLength).toBe(audioBytes.length);
    expect(new Uint8Array(result.data as ArrayBuffer)).toEqual(audioBytes);
  });

  test("ネストの ArrayBuffer も元バイト列と完全一致して復元される", () => {
    const audioBytes = new Uint8Array([9, 8]);
    const b64 = Buffer.from(audioBytes).toString("base64");
    const raw = JSON.stringify({
      type: "nested",
      data: { audio: { __type: "ArrayBuffer", data: b64 }, name: "x" },
    });
    const result = deserialize(raw) as { type: string; data: any };
    expect(result.data.name).toBe("x");
    expect(result.data.audio).toBeInstanceOf(ArrayBuffer);
    expect((result.data.audio as ArrayBuffer).byteLength).toBe(audioBytes.length);
    expect(new Uint8Array(result.data.audio as ArrayBuffer)).toEqual(audioBytes);
  });

  test("リグレッション: 短いバッファでも Node 内部プールが露出しない", () => {
    // Buffer.from(string, "base64") は short data で内部プール (poolSize=8192)
    // からスライスを返すため、.buffer をそのまま渡すと先頭にプール内の他バッファ
    // 残骸が混入する。デシリアライザはこれを排除し実バイト範囲のみ返す必要がある。
    const tiny = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const b64 = Buffer.from(tiny).toString("base64");
    const raw = JSON.stringify({
      type: "tiny",
      data: { __type: "ArrayBuffer", data: b64 },
    });
    const result = deserialize(raw);
    const ab = result.data as ArrayBuffer;
    expect(ab.byteLength).toBe(4);                        // プール 8192 が漏れていない
    expect(ab.byteLength).toBeLessThan(8192);             // 同上、二重ガード
    expect(new Uint8Array(ab)).toEqual(tiny);             // 中身も完全一致
  });

  test("リグレッション: 連続復号でも各 ArrayBuffer が独立した実バイトのみ持つ", () => {
    // プール内のオフセットは前回の Buffer 確保で進む。連続して短いバッファを
    // 復号した場合に、先頭に直前の Buffer の残骸が混じらないことを確認する。
    const a = new Uint8Array([0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
    const b = new Uint8Array([0xbb, 0xbb, 0xbb]);
    const aBuf = deserialize(
      JSON.stringify({ type: "a", data: { __type: "ArrayBuffer", data: Buffer.from(a).toString("base64") } }),
    ).data as ArrayBuffer;
    const bBuf = deserialize(
      JSON.stringify({ type: "b", data: { __type: "ArrayBuffer", data: Buffer.from(b).toString("base64") } }),
    ).data as ArrayBuffer;
    expect(aBuf.byteLength).toBe(a.length);
    expect(bBuf.byteLength).toBe(b.length);
    expect(new Uint8Array(aBuf)).toEqual(a);
    expect(new Uint8Array(bBuf)).toEqual(b);              // bBuf 先頭に 0xaa が残らない
  });
});
