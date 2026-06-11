import { describe, expect, test } from "vitest";
import {
  serializeStream,
  deserializeStream,
} from "../../../src/redis/streamsRedis";

describe("deserializeStream", () => {
  test("serialize → deserialize で元の主要フィールドが復元される", () => {
    const audio = new Uint8Array([10, 20, 30, 40]).buffer;
    const buff: any = {
      source: "CHAT",
      audio,
      video: "v",
      bufferSize: 1024,
      duration: 1,
      from: "c1",
      floating: true,
      filter: { flag: false, type: "lowpass", frequency: 1000, Q: 1, gain: 1 },
      timestamp: 999,
    };
    const json = serializeStream(buff);
    const restored = deserializeStream(json);
    expect(restored.source).toBe("CHAT");
    expect(restored.bufferSize).toBe(1024);
    expect(restored.duration).toBe(1);
    expect(restored.from).toBe("c1");
    expect(restored.floating).toBe(true);
    expect(restored.timestamp).toBe(999);
    expect(new Uint8Array(restored.audio as ArrayBuffer)).toEqual(
      new Uint8Array(audio),
    );
  });

  test("audio が空 base64 でも復元できる", () => {
    const json = JSON.stringify({
      source: "EMPTY",
      audio: "",
      video: "",
      bufferSize: 0,
      duration: 0,
      from: "x",
      floating: false,
      filter: {},
      timestamp: 0,
    });
    const restored = deserializeStream(json);
    expect((restored.audio as ArrayBuffer).byteLength).toBe(0);
    expect(restored.source).toBe("EMPTY");
  });
});
