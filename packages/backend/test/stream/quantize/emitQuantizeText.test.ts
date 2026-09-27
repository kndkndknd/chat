import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));

vi.mock("../../../src/socket/ioEmit", () => ({
  stringEmit: vi.fn(),
}));

import { emitQuantizeText } from "../../../src/stream/quantize/emitQuantizeText";
import { stringEmit } from "../../../src/socket/ioEmit";

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

describe("emitQuantizeText", () => {
  beforeEach(() => vi.clearAllMocks());

  test("対象 client にのみ QUANTIZE:<flag> を timeout=true で送る", () => {
    emitQuantizeText(makeObj({ c1: true, c2: false }), ["c1"]);
    expect(stringEmit).toHaveBeenCalledTimes(1);
    expect(stringEmit).toHaveBeenCalledWith("QUANTIZE:true", true, "c1");
  });

  test("複数 client それぞれに送る", () => {
    emitQuantizeText(makeObj({ c1: true, c2: false }), ["c1", "c2"]);
    expect(stringEmit).toHaveBeenCalledTimes(2);
    expect(stringEmit).toHaveBeenCalledWith("QUANTIZE:true", true, "c1");
    expect(stringEmit).toHaveBeenCalledWith("QUANTIZE:false", true, "c2");
  });

  test("stream 指定時はその stream の flag を使う", () => {
    const obj = {
      c1: {
        PLAYBACK: streamState(true),
        TIMELAPSE: streamState(false),
        EMPTY: streamState(false),
      },
    };
    emitQuantizeText(obj, ["c1"], "TIMELAPSE");
    expect(stringEmit).toHaveBeenCalledWith("QUANTIZE:false", true, "c1");
  });

  test("client が undefined / obj に無い場合は送らない", () => {
    emitQuantizeText(makeObj({ c1: true }), [undefined as unknown as string]);
    expect(stringEmit).not.toHaveBeenCalled();
    emitQuantizeText(makeObj({ c1: true }), ["unknown"]);
    expect(stringEmit).not.toHaveBeenCalled();
  });

  test("clients が空なら送らない", () => {
    emitQuantizeText(makeObj({ c1: true }), []);
    expect(stringEmit).not.toHaveBeenCalled();
  });
});
