import { describe, expect, test, vi } from "vitest";

vi.mock("../../src/state", () => ({
  streamState: { basisBufferSize: 8 },
}));

import { genEmptyBuff } from "../../src/stream/genEmptyBuff";

describe("genEmptyBuff", () => {
  test("basisBufferSize 個の Float32 (=4バイト) で全て 1.0 の ArrayBuffer を返す", () => {
    const buf = genEmptyBuff();
    expect(buf).toBeInstanceOf(ArrayBuffer);
    expect(buf.byteLength).toBe(8 * 4);
    const arr = new Float32Array(buf);
    expect(Array.from(arr)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });
});
