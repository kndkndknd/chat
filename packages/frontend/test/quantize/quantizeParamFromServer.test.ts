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
    const streams = stateMock.quantizeState.stream as Record<
      string,
      { flag: boolean; beat: number }
    >;
    for (const key of Object.keys(streams)) {
      if (!["CHAT", "PLAYBACK", "TIMELAPSE"].includes(key)) {
        delete streams[key];
      }
    }
    streams.CHAT = { flag: true, beat: 1 };
    streams.PLAYBACK = { flag: true, beat: 1 };
    streams.TIMELAPSE = { flag: false, beat: 1 };
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

  test("未知の stream は flag=false で追加し beat を反映する", () => {
    quantizeParamFromServer(makeData({ UPLOADED: 8 }), ["UPLOADED"]);

    const streams = stateMock.quantizeState.stream as Record<
      string,
      { flag: boolean; beat: number }
    >;
    expect(streams.UPLOADED).toEqual({ flag: false, beat: 8 });
  });

  test("CHAT の beat を canvas に表示する", () => {
    quantizeParamFromServer(makeData({ CHAT: 6 }), ["CHAT"]);

    expect(textPrintMock).toHaveBeenCalledTimes(1);
    expect(textPrintMock).toHaveBeenCalledWith("BEAT: 6", { timeout: true });
  });

  test("CHAT が無ければ空の BEAT 表示になる", () => {
    quantizeParamFromServer(makeData({ PLAYBACK: 8 }), ["PLAYBACK"]);

    expect(textPrintMock).toHaveBeenCalledWith("BEAT: ", { timeout: true });
  });
});
