import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cmdState } from "../../../src/state";
import { ioState } from "../../../src/state/states/ioState";
import { voiceEmit } from "../../../src/socket/ioEmit";

type EmitRecord = { id: string; event: string; data: unknown };

describe("voiceEmit", () => {
  let emits: EmitRecord[];

  beforeEach(() => {
    emits = [];
    cmdState.VOICE = [];
    cmdState.voiceLang = "en-US";
    ioState.io = {
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

  it("VOICE モードのクライアントがいなければ送信しない", () => {
    voiceEmit("HELLO", "client-a");
    expect(emits).toEqual([]);
  });

  it("指定クライアントが VOICE モードなら現在の言語で送信する", () => {
    cmdState.VOICE = ["client-a"];
    cmdState.voiceLang = "ja-JP";

    voiceEmit("こんにちは", "client-a");

    expect(emits).toEqual([
      {
        id: "client-a",
        event: "voiceFromServer",
        data: { text: "こんにちは", lang: "ja-JP" },
      },
    ]);
  });

  it("all / ALL / scenario は VOICE モードの全クライアントへ送信する", () => {
    cmdState.VOICE = ["client-a", "client-b"];

    voiceEmit("STOP", "all");
    voiceEmit("STOP", "ALL");
    voiceEmit("STOP", "scenario");

    expect(emits.map((e) => e.id)).toEqual([
      "client-a",
      "client-b",
      "client-a",
      "client-b",
      "client-a",
      "client-b",
    ]);
  });

  it("VOICE モードでないクライアントには送信しない", () => {
    cmdState.VOICE = ["client-a"];

    voiceEmit("HELLO", "client-b");

    expect(emits).toEqual([]);
  });
});
