import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/stream/quantize", () => ({
  setParamsSplitQuantize: vi.fn(),
  setBpmState: vi.fn(),
}));

vi.mock("../../../src/socket/ioEmit", () => ({
  stringEmit: vi.fn(),
  quantizeEmit: vi.fn(),
}));

vi.mock("../../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

vi.mock("../../../src/state", () => ({
  bpmState: {} as Record<string, any>,
  bpmStateDefault: {
    bpm: 60,
    beat: 4,
    quantizeFlag: false,
  },
}));

vi.mock("../../../src/stream/quantize/emitQuantizeText", () => ({
  emitQuantizeText: vi.fn(),
}));

import { splitQuantize } from "../../../src/cmd/splitSpace/splitQuantize";
import { setParamsSplitQuantize } from "../../../src/stream/quantize";
import { emitQuantizeText } from "../../../src/stream/quantize/emitQuantizeText";
import { bpmState } from "../../../src/state";

const streamState = (quantizeFlag: boolean) => ({
  beat: 4,
  gridFlag: false,
  quantizeFlag,
});

const makeObj = (flags: Record<string, boolean>) =>
  Object.fromEntries(
    Object.entries(flags).map(([client, flag]) => [
      client,
      {
        PLAYBACK: streamState(flag),
        TIMELAPSE: streamState(flag),
        EMPTY: streamState(flag),
      },
    ]),
  );

describe("splitQuantize emitQuantizeText 連携", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  });

  test("target 指定時は対象 client のみに送る", () => {
    const obj = makeObj({ c1: true, c2: false });
    (setParamsSplitQuantize as any).mockReturnValue(obj);

    splitQuantize(["ON"], ["c1"]);

    expect(emitQuantizeText).toHaveBeenCalledWith(obj, ["c1"], undefined);
  });

  test("stream 指定時はその stream を渡す", () => {
    const obj = makeObj({ c1: true });
    (setParamsSplitQuantize as any).mockReturnValue(obj);

    splitQuantize(["PLAYBACK", "ON"], ["c1"]);

    expect(emitQuantizeText).toHaveBeenCalledWith(obj, ["c1"], "PLAYBACK");
  });

  test("target 未指定時は全 client に送る", () => {
    const obj = makeObj({ c1: true, c2: false });
    (setParamsSplitQuantize as any).mockReturnValue(obj);

    splitQuantize(["ON"]);

    expect(emitQuantizeText).toHaveBeenCalledWith(obj, ["c1", "c2"], undefined);
  });

  test("paramArr が空で target 指定時は対象のみに送る", () => {
    (bpmState as any).c1 = {
      stream: {
        PLAYBACK: streamState(false),
        TIMELAPSE: streamState(false),
        EMPTY: streamState(false),
      },
    };

    splitQuantize([], ["c1"]);

    expect(emitQuantizeText).toHaveBeenCalledTimes(1);
    const [obj, clients] = (emitQuantizeText as any).mock.calls[0];
    expect(clients).toEqual(["c1"]);
    expect(obj.c1.PLAYBACK.quantizeFlag).toBe(true);
  });
});
