import { describe, expect, test } from "vitest";
import { deserialize, serialize } from "../../../src/socket/SocketFacade";

describe("deserialize", () => {
  test("通常の JSON は { type, data } として復元される", () => {
    const raw = JSON.stringify({ type: "ping", data: { v: 1 } });
    expect(deserialize(raw)).toEqual({ type: "ping", data: { v: 1 } });
  });

  test("__type=ArrayBuffer のフィールドは ArrayBuffer に復元され、バイト一致", () => {
    const audioBytes = new Uint8Array([1, 2, 3, 250]);
    const b64 = btoa(String.fromCharCode(...audioBytes));
    const raw = JSON.stringify({
      type: "audio",
      data: { __type: "ArrayBuffer", data: b64 },
    });
    const result = deserialize(raw);
    expect(result.type).toBe("audio");
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result.data as ArrayBuffer)).toEqual(audioBytes);
  });

  test("ネストの ArrayBuffer も復元される", () => {
    const audioBytes = new Uint8Array([9, 8, 7]);
    const b64 = btoa(String.fromCharCode(...audioBytes));
    const raw = JSON.stringify({
      type: "nested",
      data: { audio: { __type: "ArrayBuffer", data: b64 }, name: "x" },
    });
    const result = deserialize(raw) as { type: string; data: any };
    expect(result.data.name).toBe("x");
    expect(result.data.audio).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result.data.audio)).toEqual(audioBytes);
  });

  test("serialize → deserialize でラウンドトリップ整合性 (ArrayBuffer)", () => {
    const audio = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const json = serialize("rt", audio);
    const result = deserialize(json);
    expect(new Uint8Array(result.data as ArrayBuffer)).toEqual(
      new Uint8Array(audio),
    );
  });
});
