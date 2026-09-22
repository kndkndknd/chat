import { describe, expect, test, vi, beforeEach } from "vitest";

const { textPrintMock, stateMock } = vi.hoisted(() => ({
  textPrintMock: vi.fn(),
  stateMock: {
    quantizeState: {
      stream: {
        CHAT: { flag: true, beat: 1 },
        PLAYBACK: { flag: true, beat: 1 },
        TIMELAPSE: { flag: false, beat: 1 },
      },
    },
  },
}));

vi.mock("../../src/state", () => stateMock);
vi.mock("../../src/canvasEvent", () => ({ textPrint: textPrintMock }));

import { quantizeParamFromServer } from "../../src/quantize/quantizeParamFromServer";

const makeData = (beats: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(beats).map(([s, beat]) => [
      s,
      { beat, gridFlag: false, quantizeFlag: false },
    ]),
  ) as any;

describe("quantizeParamFromServer", () => {
  beforeEach(() => {
    textPrintMock.mockClear();
    stateMock.quantizeState.stream.CHAT = { flag: true, beat: 1 };
    stateMock.quantizeState.stream.PLAYBACK = { flag: true, beat: 1 };
    stateMock.quantizeState.stream.TIMELAPSE = { flag: false, beat: 1 };
  });

  test("対象 stream の beat のみ反映し flag は変更しない", () => {
    quantizeParamFromServer(
      makeData({ CHAT: 4, PLAYBACK: 8, TIMELAPSE: 2 }),
      ["CHAT", "PLAYBACK"],
    );

    expect(stateMock.quantizeState.stream.CHAT.beat).toBe(4);
    expect(stateMock.quantizeState.stream.PLAYBACK.beat).toBe(8);
    expect(stateMock.quantizeState.stream.TIMELAPSE.beat).toBe(1);
    expect(stateMock.quantizeState.stream.CHAT.flag).toBe(true);
    expect(stateMock.quantizeState.stream.TIMELAPSE.flag).toBe(false);
  });

  test("streams に含まれない stream は更新しない", () => {
    quantizeParamFromServer(makeData({ CHAT: 4, PLAYBACK: 8 }), ["PLAYBACK"]);

    expect(stateMock.quantizeState.stream.CHAT.beat).toBe(1);
    expect(stateMock.quantizeState.stream.PLAYBACK.beat).toBe(8);
  });

  test("data に存在しない stream は更新しない", () => {
    quantizeParamFromServer(makeData({ CHAT: 4 }), ["CHAT", "PLAYBACK"]);

    expect(stateMock.quantizeState.stream.CHAT.beat).toBe(4);
    expect(stateMock.quantizeState.stream.PLAYBACK.beat).toBe(1);
  });

  test("CHAT の beat を canvas に表示する", () => {
    quantizeParamFromServer(makeData({ CHAT: 6 }), ["CHAT"]);

    expect(textPrintMock).toHaveBeenCalledTimes(1);
    expect(textPrintMock).toHaveBeenCalledWith("BEAT: 6");
  });

  test("CHAT が無ければ空の BEAT 表示になる", () => {
    quantizeParamFromServer(makeData({ PLAYBACK: 8 }), ["PLAYBACK"]);

    expect(textPrintMock).toHaveBeenCalledWith("BEAT: ");
  });
});
