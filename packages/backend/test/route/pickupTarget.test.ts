import { describe, expect, test } from "vitest";
import { pickupTarget } from "../../src/route";

describe("pickupTarget", () => {
  test("io.sockets.adapter.rooms が undefined なら空配列", () => {
    const io = { sockets: { adapter: {} } };
    expect(pickupTarget(io, { foo: 1 }, "src")).toEqual([]);
  });

  test("rooms に list のキーが含まれていれば idArr に push される", () => {
    const io = {
      sockets: {
        adapter: { rooms: { a: 1, b: 1, c: 1 } },
      },
    };
    const list = { a: true, b: true };
    expect(pickupTarget(io, list, "src")).toEqual(["a", "b"]);
  });

  test("list が空なら空配列", () => {
    const io = {
      sockets: {
        adapter: { rooms: { a: 1, b: 1 } },
      },
    };
    expect(pickupTarget(io, {}, "src")).toEqual([]);
  });

  test("list の値が undefined のキーはスキップされる", () => {
    const io = {
      sockets: {
        adapter: { rooms: { a: 1, b: 1 } },
      },
    };
    const list = { a: true, b: undefined };
    expect(pickupTarget(io, list, "src")).toEqual(["a"]);
  });
});
