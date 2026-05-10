import { describe, expect, test } from "vitest";
import { bufferSizeChange } from "../../src/stream/bufferSizeChange";

describe("bufferSizeChange", () => {
  test("0 や負値は最小値 256 にスナップ", () => {
    expect(bufferSizeChange(0)).toBe(256);
    expect(bufferSizeChange(-100)).toBe(256);
  });

  test("段階値の境界（256/512/1024/2048/4096/8192）", () => {
    expect(bufferSizeChange(256)).toBe(256);
    expect(bufferSizeChange(257)).toBe(512);
    expect(bufferSizeChange(512)).toBe(512);
    expect(bufferSizeChange(513)).toBe(1024);
    expect(bufferSizeChange(1024)).toBe(1024);
    expect(bufferSizeChange(1025)).toBe(2048);
    expect(bufferSizeChange(2048)).toBe(2048);
    expect(bufferSizeChange(4096)).toBe(4096);
    expect(bufferSizeChange(8192)).toBe(8192);
  });

  test("8192 を超えると 16384 が返る", () => {
    expect(bufferSizeChange(8193)).toBe(16384);
    expect(bufferSizeChange(99999)).toBe(16384);
  });
});
