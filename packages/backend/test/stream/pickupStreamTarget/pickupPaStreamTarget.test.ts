import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/state", () => ({
  streamState: { target: {} },
  clientState: { paStreamClient: [] as string[], streamClient: [] },
}));

import { pickupPaStreamTarget } from "../../../src/stream/pickupStreamTarget";
import { clientState } from "../../../src/state";

describe("pickupPaStreamTarget", () => {
  beforeEach(() => {
    (clientState as any).paStreamClient.length = 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("paStreamClient が空なら空文字を返す", () => {
    expect(pickupPaStreamTarget()).toBe("");
  });

  test("paStreamClient から無作為に 1 件返す", () => {
    (clientState as any).paStreamClient.push("p1", "p2");
    expect(pickupPaStreamTarget()).toBe("p1");
  });
});
