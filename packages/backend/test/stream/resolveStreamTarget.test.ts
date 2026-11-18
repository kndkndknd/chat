import { beforeEach, describe, expect, test, vi } from "vitest";

const { pickupStreamTargetMock, pickupPaStreamTargetMock } = vi.hoisted(() => ({
  pickupStreamTargetMock: vi.fn(),
  pickupPaStreamTargetMock: vi.fn(),
}));

vi.mock("../../src/state", () => ({
  clientState: {
    client: {
      active: { stream: true },
      inactive: { stream: false },
    },
  },
  streamState: {
    pa: { PLAYBACK: false } as Record<string, boolean>,
  },
}));
vi.mock("../../src/stream/pickupStreamTarget", () => ({
  pickupStreamTarget: pickupStreamTargetMock,
  pickupPaStreamTarget: pickupPaStreamTargetMock,
}));

import { resolveStreamTarget } from "../../src/stream/resolveStreamTarget";
import { streamState } from "../../src/state";

describe("resolveStreamTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    streamState.pa.PLAYBACK = false;
    pickupStreamTargetMock.mockReturnValue("picked");
    pickupPaStreamTargetMock.mockReturnValue("pa");
  });

  test("有効な明示 target を最優先する", () => {
    expect(resolveStreamTarget("PLAYBACK", "from", "active")).toBe("active");
    expect(pickupStreamTargetMock).not.toHaveBeenCalled();
  });

  test("明示 target が切断済みならフォールバックしない", () => {
    expect(resolveStreamTarget("PLAYBACK", "from", "inactive")).toBe("");
    expect(pickupStreamTargetMock).not.toHaveBeenCalled();
  });

  test("PA モードは target 未指定時に PA クライアントを返す", () => {
    streamState.pa.PLAYBACK = true;
    expect(resolveStreamTarget("PLAYBACK", "from")).toBe("pa");
    expect(pickupPaStreamTargetMock).toHaveBeenCalled();
  });

  test("target 未指定なら from 付きで通常選択する", () => {
    expect(resolveStreamTarget("PLAYBACK", "from")).toBe("picked");
    expect(pickupStreamTargetMock).toHaveBeenCalledWith(
      "PLAYBACK",
      "from",
    );
  });

  test("from も無ければ通常選択する", () => {
    expect(resolveStreamTarget("PLAYBACK")).toBe("picked");
    expect(pickupStreamTargetMock).toHaveBeenCalledWith("PLAYBACK");
  });
});
