import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  streamState: { target: {} },
  clientState: {
    paStreamClient: [] as string[],
    streamClient: [],
    client: {} as Record<string, { stream: boolean }>,
  },
}));

import { pickupPaStreamTarget } from "../../../src/stream/pickupStreamTarget";
import { clientState } from "../../../src/state";

describe("pickupPaStreamTarget", () => {
  beforeEach(() => {
    for (const k of Object.keys(clientState.client))
      delete clientState.client[k];
    (clientState as any).paStreamClient.length = 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("paStreamClient が空なら空文字を返す", () => {
    expect(pickupPaStreamTarget()).toBe("");
  });

  test("paStreamClient から有効なクライアントを無作為に 1 件返す", () => {
    (clientState as any).paStreamClient.push("p1", "p2");
    clientState.client.p1 = { stream: true };
    clientState.client.p2 = { stream: true };
    expect(pickupPaStreamTarget()).toBe("p1");
  });

  test("paStreamClient に切断済み ID が残っていても無視する", () => {
    (clientState as any).paStreamClient.push("dead", "p1");
    clientState.client.p1 = { stream: true };
    expect(pickupPaStreamTarget()).toBe("p1");
  });
});
