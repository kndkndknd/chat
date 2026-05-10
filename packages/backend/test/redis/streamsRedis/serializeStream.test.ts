import { describe, expect, test } from "vitest";
import { serializeStream } from "../../../src/redis/streamsRedis";

describe("serializeStream", () => {
  test("audio (ArrayBuffer) を base64 化し JSON 化する", () => {
    const audio = new Uint8Array([1, 2, 3, 4]).buffer;
    const buff: any = {
      source: "CHAT",
      audio,
      video: "",
      bufferSize: 8192,
      duration: 1.5,
      from: "client1",
      floating: false,
      filter: { flag: false, type: "lowpass", frequency: 1000, Q: 1, gain: 1 },
      timestamp: 1234567890,
    };
    const json = serializeStream(buff);
    const parsed = JSON.parse(json);
    expect(parsed.audio).toBe(Buffer.from(audio).toString("base64"));
    expect(parsed.source).toBe("CHAT");
    expect(parsed.bufferSize).toBe(8192);
    expect(parsed.timestamp).toBe(1234567890);
    expect(parsed.from).toBe("client1");
    expect(parsed.floating).toBe(false);
  });

  test("空の audio (length 0) でも壊れない", () => {
    const buff: any = {
      source: "PLAYBACK",
      audio: new Uint8Array([]).buffer,
      video: "",
      bufferSize: 256,
      duration: 0,
      from: "x",
      floating: false,
      filter: {},
      timestamp: 0,
    };
    const json = serializeStream(buff);
    const parsed = JSON.parse(json);
    expect(parsed.audio).toBe("");
  });
});
