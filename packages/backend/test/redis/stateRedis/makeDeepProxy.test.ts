import { describe, expect, test, vi } from "vitest";
import { makeDeepProxy } from "../../../src/redis/stateRedis";

describe("makeDeepProxy", () => {
  test("既存値の取得は元の値と同じ", () => {
    const onChange = vi.fn();
    const proxy = makeDeepProxy({ a: 1, b: "x" }, onChange);
    expect(proxy.a).toBe(1);
    expect(proxy.b).toBe("x");
    expect(onChange).not.toHaveBeenCalled();
  });

  test("set すると onChange が呼ばれる", () => {
    const onChange = vi.fn();
    const proxy = makeDeepProxy({ a: 1 } as { a: number }, onChange);
    proxy.a = 2;
    expect(proxy.a).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("delete すると onChange が呼ばれる", () => {
    const onChange = vi.fn();
    const proxy = makeDeepProxy({ a: 1, b: 2 } as Record<string, number>, onChange);
    delete proxy.a;
    expect(proxy.a).toBeUndefined();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("ネストしたオブジェクトの set でも onChange が呼ばれる（deep proxy）", () => {
    const onChange = vi.fn();
    const proxy = makeDeepProxy({ inner: { x: 1 } }, onChange);
    proxy.inner.x = 99;
    expect(proxy.inner.x).toBe(99);
    expect(onChange).toHaveBeenCalled();
  });

  test("配列の push などのメソッド呼び出しでも onChange が呼ばれる", () => {
    const onChange = vi.fn();
    const proxy = makeDeepProxy({ arr: [1, 2] } as { arr: number[] }, onChange);
    proxy.arr.push(3);
    // push は内部で set しつつ、関数呼び出し後 onChange も発火する
    expect(proxy.arr.length).toBe(3);
    expect(onChange).toHaveBeenCalled();
  });
});
