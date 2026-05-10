import { describe, expect, test } from "vitest";
import { serialize } from "../../../src/socket/SocketFacade";

describe("serialize", () => {
  test("event と data を { type, data } の JSON に整形", () => {
    expect(JSON.parse(serialize("ping", { foo: 1 }))).toEqual({
      type: "ping",
      data: { foo: 1 },
    });
  });

  test("ArrayBuffer は __type マーカ付き base64 オブジェクトに変換される", () => {
    const audio = new Uint8Array([1, 2, 3]).buffer;
    const json = serialize("audio", audio);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("audio");
    expect(parsed.data.__type).toBe("ArrayBuffer");
    expect(parsed.data.data).toBe(btoa("\x01\x02\x03"));
  });

  test("ネストされた ArrayBuffer も変換される", () => {
    const audio = new Uint8Array([10, 20]).buffer;
    const json = serialize("nested", { sound: audio, name: "x" });
    const parsed = JSON.parse(json);
    expect(parsed.data.name).toBe("x");
    expect(parsed.data.sound.__type).toBe("ArrayBuffer");
    expect(parsed.data.sound.data).toBe(btoa("\x0A\x14"));
  });

  test("data が undefined の場合", () => {
    expect(JSON.parse(serialize("ev", undefined))).toEqual({ type: "ev" });
  });

  test("CHUNK 境界 (>8192 bytes) でも壊れない", () => {
    const big = new Uint8Array(10000);
    for (let i = 0; i < big.length; i++) big[i] = i % 256;
    const json = serialize("big", big.buffer);
    const parsed = JSON.parse(json);
    expect(parsed.data.__type).toBe("ArrayBuffer");
    // base64 復元が元バイトと一致することを確認
    const restored = atob(parsed.data.data);
    expect(restored.length).toBe(big.length);
    expect(restored.charCodeAt(0)).toBe(0);
    expect(restored.charCodeAt(255)).toBe(255);
    expect(restored.charCodeAt(8192)).toBe(8192 % 256);
  });
});
