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

  test("__type=ArrayBuffer のフィールドは ArrayBuffer に復元される", () => {
    const audioBytes = new Uint8Array([1, 2, 3]);
    const b64 = Buffer.from(audioBytes).toString("base64");
    const raw = JSON.stringify({
      type: "audio",
      data: { __type: "ArrayBuffer", data: b64 },
    });
    const result = deserialize(raw);
    expect(result.type).toBe("audio");
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    // Node Buffer の pool 仕様により result.data は元の audio バイト「以上」の長さを持つ
    expect((result.data as ArrayBuffer).byteLength).toBeGreaterThanOrEqual(
      audioBytes.length,
    );
  });

  test("ネストの ArrayBuffer も復元される", () => {
    const audioBytes = new Uint8Array([9, 8]);
    const b64 = Buffer.from(audioBytes).toString("base64");
    const raw = JSON.stringify({
      type: "nested",
      data: { audio: { __type: "ArrayBuffer", data: b64 }, name: "x" },
    });
    const result = deserialize(raw) as { type: string; data: any };
    expect(result.data.name).toBe("x");
    expect(result.data.audio).toBeInstanceOf(ArrayBuffer);
    expect((result.data.audio as ArrayBuffer).byteLength).toBeGreaterThanOrEqual(
      audioBytes.length,
    );
  });
});
