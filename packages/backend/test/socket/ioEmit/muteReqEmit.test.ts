import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ioState } from "../../../src/state/states/ioState";
import { muteReqEmit } from "../../../src/socket/ioEmit";

type EmitRecord = { id?: string; event: string; data: unknown };

describe("muteReqEmit", () => {
  let emits: EmitRecord[];

  beforeEach(() => {
    emits = [];
    ioState.io = {
      emit: (event: string, data?: unknown) => {
        emits.push({ event, data });
      },
      to: (id: string) => ({
        emit: (event: string, data?: unknown) => {
          emits.push({ id, event, data });
        },
      }),
    } as any;
  });

  afterEach(() => {
    ioState.io = null;
  });

  it("target 省略時は全クライアントへ送る", () => {
    muteReqEmit(true);
    expect(emits).toEqual([
      { event: "muteReqFromServer", data: { flag: true } },
    ]);
  });

  it("target 指定時は対象クライアントだけへ送る", () => {
    muteReqEmit(false, "client-a");
    expect(emits).toEqual([
      { id: "client-a", event: "muteReqFromServer", data: { flag: false } },
    ]);
  });
});
