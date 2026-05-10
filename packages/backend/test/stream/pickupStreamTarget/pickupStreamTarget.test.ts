import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  streamState: { target: {} as Record<string, string[]> },
  clientState: { streamClient: [] as string[] },
}));

import { pickupStreamTarget } from "../../../src/stream/pickupStreamTarget";
import { streamState, clientState } from "../../../src/state";

describe("pickupStreamTarget", () => {
  beforeEach(() => {
    for (const k of Object.keys(streamState.target))
      delete (streamState.target as any)[k];
    clientState.streamClient.length = 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("target に 1 件しかなければそれを返す", () => {
    streamState.target.PLAYBACK = ["only"];
    expect(pickupStreamTarget("PLAYBACK")).toBe("only");
  });

  test("target に複数あればその中から無作為に 1 件", () => {
    streamState.target.PLAYBACK = ["a", "b", "c"];
    expect(pickupStreamTarget("PLAYBACK")).toBe("a");
  });

  test("CHAT の場合は from を除外する", () => {
    streamState.target.CHAT = ["a", "b"];
    expect(pickupStreamTarget("CHAT", "a")).toBe("b");
  });

  test("除外後に空になれば from を返す", () => {
    streamState.target.CHAT = ["a", "a"];
    expect(pickupStreamTarget("CHAT", "a")).toBe("a");
  });

  test("target が undefined の場合は streamClient から無作為", () => {
    clientState.streamClient.push("s1", "s2");
    expect(pickupStreamTarget("MISSING")).toBe("s1");
  });

  test("target も streamClient も無ければ空文字を返す", () => {
    expect(pickupStreamTarget("MISSING")).toBe("");
  });
});
