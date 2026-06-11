import { describe, expect, test } from "vitest";
import { decodeAudio } from "../../../src/stream/toPostgres/getStream";

describe("decodeAudio", () => {
  test("base64 文字列を ArrayBuffer に復元する", () => {
    const bytes = new Uint8Array([0, 1, 2, 255]);
    const b64 = Buffer.from(bytes).toString("base64");
    const result = decodeAudio(b64);
    expect(new Uint8Array(result)).toEqual(bytes);
  });

  test("空文字は length 0 の ArrayBuffer", () => {
    const result = decodeAudio("");
    expect(result.byteLength).toBe(0);
  });
});
