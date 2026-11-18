import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ioState } from "../../../src/state/states/ioState";
import { clientSettingEmit } from "../../../src/socket/ioEmit";

type EmitRecord = { id?: string; event: string; data: unknown };

describe("clientSettingEmit", () => {
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

  it("target 省略時は clientSettingsFromServer を全クライアントへ送る", () => {
    clientSettingEmit({ facedetection: true, hanged: false });
    expect(emits).toEqual([
      {
        event: "clientSettingsFromServer",
        data: { facedetection: true, hanged: false },
      },
    ]);
  });

  it("target 指定時は対象クライアントだけへ送る", () => {
    clientSettingEmit({ facedetection: false, hanged: true }, "client-a");
    expect(emits).toEqual([
      {
        id: "client-a",
        event: "clientSettingsFromServer",
        data: { facedetection: false, hanged: true },
      },
    ]);
  });
});
