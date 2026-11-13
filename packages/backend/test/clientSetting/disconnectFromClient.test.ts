import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/state", () => ({
  clientState: {
    client: {} as Record<string, unknown>,
    cmdClient: [] as string[],
    streamClient: [] as string[],
    paCmdClient: [] as string[],
    paStreamClient: [] as string[],
    sinewaveClient: [] as string[],
    arduinoClient: {} as Record<string, boolean>,
  },
  bpmState: {} as Record<string, unknown>,
  cmdState: { VOICE: [] as string[] },
  currentState: {
    cmd: {} as Record<string, string[]>,
    sinewave: {} as Record<string, number>,
  },
  previousState: {
    cmd: {} as Record<string, string[]>,
    sinewave: {} as Record<string, number>,
  },
  streamState: {
    target: {} as Record<string, string[]>,
    loop: {} as Record<string, string[]>,
  },
}));

import {
  removeClientState,
  sanitizeClientReferences,
} from "../../src/clientSetting/disconnectFromClient";
import {
  bpmState,
  clientState,
  cmdState,
  currentState,
  previousState,
  streamState,
} from "../../src/state";

const reset = () => {
  clientState.client = {
    a: {},
    b: {},
  };
  clientState.cmdClient = ["a", "b"];
  clientState.streamClient = ["a", "b"];
  clientState.paCmdClient = ["a", "b"];
  clientState.paStreamClient = ["a", "b"];
  clientState.sinewaveClient = ["a", "b"];
  clientState.arduinoClient = { a: true, b: true };
  for (const key of Object.keys(bpmState)) delete (bpmState as any)[key];
  bpmState.a = {};
  bpmState.b = {};
  cmdState.VOICE = ["a", "b"];
  currentState.cmd = { BASS: ["a", "b"], CLICK: ["b"] };
  currentState.sinewave = { a: 440, b: 220 };
  previousState.cmd = { BASS: ["a", "b"] };
  previousState.sinewave = { a: 440, b: 220 };
  streamState.target = { PLAYBACK: ["a", "b"], CHAT: ["b"] };
  streamState.loop = { PLAYBACK: ["a"] };
};

describe("disconnectFromClient", () => {
  beforeEach(reset);

  test("removeClientState は全参照から対象 ID だけを除去する", () => {
    removeClientState("a");

    expect(clientState.client).toEqual({ b: {} });
    expect(clientState.cmdClient).toEqual(["b"]);
    expect(clientState.streamClient).toEqual(["b"]);
    expect(clientState.paCmdClient).toEqual(["b"]);
    expect(clientState.paStreamClient).toEqual(["b"]);
    expect(clientState.sinewaveClient).toEqual(["b"]);
    expect(clientState.arduinoClient).toEqual({ b: true });
    expect(bpmState.a).toBeUndefined();
    expect(bpmState.b).toBeDefined();
    expect(cmdState.VOICE).toEqual(["b"]);
    expect(currentState.cmd.BASS).toEqual(["b"]);
    expect(currentState.cmd.CLICK).toEqual(["b"]);
    expect(currentState.sinewave).toEqual({ b: 220 });
    expect(previousState.cmd.BASS).toEqual(["b"]);
    expect(previousState.sinewave).toEqual({ b: 220 });
    expect(streamState.target.PLAYBACK).toEqual(["b"]);
    expect(streamState.target.CHAT).toEqual(["b"]);
    expect(streamState.loop.PLAYBACK).toEqual([]);
  });

  test("sanitizeClientReferences は未接続 ID を全参照から除去する", () => {
    clientState.client = {};

    sanitizeClientReferences();

    expect(clientState.cmdClient).toEqual([]);
    expect(clientState.streamClient).toEqual([]);
    expect(clientState.paCmdClient).toEqual([]);
    expect(clientState.paStreamClient).toEqual([]);
    expect(clientState.sinewaveClient).toEqual([]);
    expect(cmdState.VOICE).toEqual([]);
    expect(currentState.cmd.BASS).toEqual([]);
    expect(currentState.cmd.CLICK).toEqual([]);
    expect(currentState.sinewave).toEqual({});
    expect(previousState.cmd.BASS).toEqual([]);
    expect(previousState.sinewave).toEqual({});
    expect(streamState.target.PLAYBACK).toEqual([]);
    expect(streamState.target.CHAT).toEqual([]);
    expect(streamState.loop.PLAYBACK).toEqual([]);
  });
});
