import { describe, expect, test } from "vitest";
import { deserializeChat } from "../../../src/redis/streamsRedis";

describe("deserializeChat", () => {
  test("base64 audio を ArrayBuffer に戻し、フィールドを保つ", () => {
    const audioBytes = new Uint8Array([5, 6, 7, 8]);
    const audioB64 = Buffer.from(audioBytes).toString("base64");
    const json = JSON.stringify({
      source: "CHAT",
      video: "vid",
      audio: audioB64,
      bufferSize: 256,
      duration: 0.5,
      from: "client",
      floating: false,
      filter: {},
      timestamp: 42,
    });
    const restored = deserializeChat(json);
    expect(restored.source).toBe("CHAT");
    expect(restored.video).toBe("vid");
    expect(restored.bufferSize).toBe(256);
    expect(restored.timestamp).toBe(42);
    expect(new Uint8Array(restored.audio as ArrayBuffer)).toEqual(audioBytes);
  });

  test("audio 空でも復元できる", () => {
    const json = JSON.stringify({
      source: "CHAT",
      video: "",
      audio: "",
      bufferSize: 0,
      duration: 0,
      from: "x",
      floating: false,
      filter: {},
      timestamp: 0,
    });
    const restored = deserializeChat(json);
    expect((restored.audio as ArrayBuffer).byteLength).toBe(0);
  });
});
