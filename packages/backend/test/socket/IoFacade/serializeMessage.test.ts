import { describe, expect, test } from "vitest";
import { serializeMessage } from "../../../src/socket/IoFacade";

describe("serializeMessage", () => {
  test("event と data を { type, data } の JSON に整形", () => {
    const json = serializeMessage("ping", { foo: 1 });
    expect(JSON.parse(json)).toEqual({ type: "ping", data: { foo: 1 } });
  });

  test("ArrayBuffer は __type マーカ付き base64 オブジェクトに変換される", () => {
    const audio = new Uint8Array([1, 2, 3]).buffer;
    const json = serializeMessage("audio", audio);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("audio");
    expect(parsed.data).toEqual({
      __type: "ArrayBuffer",
      data: Buffer.from(audio).toString("base64"),
    });
  });

  test("ネストされた ArrayBuffer も変換される", () => {
    const audio = new Uint8Array([10, 20]).buffer;
    const json = serializeMessage("nested", { sound: audio, name: "x" });
    const parsed = JSON.parse(json);
    expect(parsed.data.name).toBe("x");
    expect(parsed.data.sound).toEqual({
      __type: "ArrayBuffer",
      data: Buffer.from(audio).toString("base64"),
    });
  });

  test("data が undefined の場合", () => {
    const json = serializeMessage("ev", undefined);
    expect(JSON.parse(json)).toEqual({ type: "ev" });
  });
});
