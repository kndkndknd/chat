import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const { quantizePlayMock, chatReqMock, stateMock } = vi.hoisted(() => {
  const quantizeState = {
    bar: 4000,
    interval: null as number | null,
    currentTime: 0,
    timeout: 0,
    intervalFlag: false,
    stream: {
      CHAT: { flag: false, beat: 1 },
      PLAYBACK: { flag: false, beat: 1 },
      TIMELAPSE: { flag: false, beat: 1 },
    },
  };
  return {
    quantizePlayMock: vi.fn(),
    chatReqMock: vi.fn(),
    stateMock: {
      quantizeState,
      streamFlagState: {
        CHAT: true,
        PLAYBACK: true,
        TIMELAPSE: true,
      } as Record<string, boolean>,
      streamChunk: {} as Record<string, any>,
      contextState: { audioContext: { currentTime: 0 } },
      socketState: { socketId: "self", socket: { emit: vi.fn() } },
    },
  };
});

vi.mock("../../src/state", () => stateMock);
vi.mock("../../src/quantize/quantizePlay", () => ({
  quantizePlay: quantizePlayMock,
}));
vi.mock("../../src/stream", () => ({ chatReq: chatReqMock }));

let mod: typeof import("../../src/quantize/quantizeFromServer");

const resetState = () => {
  const s = stateMock.quantizeState;
  s.bar = 4000;
  s.interval = null;
  s.currentTime = 0;
  s.timeout = 0;
  s.intervalFlag = false;
  for (const key of Object.keys(s.stream)) {
    s.stream[key as keyof typeof s.stream].flag = false;
    s.stream[key as keyof typeof s.stream].beat = 1;
  }
  for (const key of Object.keys(stateMock.streamChunk)) {
    delete stateMock.streamChunk[key];
  }
  stateMock.streamFlagState.CHAT = true;
  stateMock.streamFlagState.PLAYBACK = true;
  stateMock.streamFlagState.TIMELAPSE = true;
};

const makeChunk = () => ({
  source: "CHAT",
  audio: new Float32Array(8),
  sampleRate: 44100,
  glitch: false,
  bufferSize: 8,
});

describe("quantizeFromServer", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    resetState();
    mod = await import("../../src/quantize/quantizeFromServer");
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("data の flag/beat を quantizeState.stream に反映する", () => {
    mod.quantizeFromServer({
      CHAT: { quantizeFlag: true, beat: 4, gridFlag: false },
    } as any);

    expect(stateMock.quantizeState.stream.CHAT.flag).toBe(true);
    expect(stateMock.quantizeState.stream.CHAT.beat).toBe(4);
    // flag が立ったので interval が開始される
    expect(stateMock.quantizeState.interval).not.toBeNull();
  });

  test("ON→OFF で streamChunk を破棄し、CHAT なら chatReq を呼ぶ", () => {
    stateMock.quantizeState.stream.CHAT.flag = true;
    stateMock.streamChunk.CHAT = makeChunk();

    mod.quantizeFromServer({
      CHAT: { quantizeFlag: false, beat: 1, gridFlag: false },
    } as any);

    expect(stateMock.quantizeState.stream.CHAT.flag).toBe(false);
    expect(stateMock.streamChunk.CHAT).toEqual({});
    expect(chatReqMock).toHaveBeenCalledTimes(1);
    expect(chatReqMock).toHaveBeenCalledWith("self");
    // 全 flag が false になったので interval は停止
    expect(stateMock.quantizeState.interval).toBeNull();
  });

  test("ON→OFF で CHAT 以外は chatReq を呼ばない", () => {
    stateMock.quantizeState.stream.PLAYBACK.flag = true;
    stateMock.streamChunk.PLAYBACK = makeChunk();

    mod.quantizeFromServer({
      PLAYBACK: { quantizeFlag: false, beat: 1, gridFlag: false },
    } as any);

    expect(stateMock.streamChunk.PLAYBACK).toEqual({});
    expect(chatReqMock).not.toHaveBeenCalled();
  });

  test("ON 直後の初回チャンクだけ playPendingQuantizeChunk が即再生する", () => {
    mod.quantizeFromServer({
      CHAT: { quantizeFlag: true, beat: 2, gridFlag: false },
    } as any);

    const chunk = makeChunk();
    stateMock.streamChunk.CHAT = chunk;
    quantizePlayMock.mockClear();

    mod.playPendingQuantizeChunk("CHAT");
    expect(quantizePlayMock).toHaveBeenCalledTimes(1);
    expect(quantizePlayMock).toHaveBeenCalledWith(chunk, 2);

    // 2 回目は pending が下りているので再生しない
    mod.playPendingQuantizeChunk("CHAT");
    expect(quantizePlayMock).toHaveBeenCalledTimes(1);
  });

  test("pending でなければ playPendingQuantizeChunk は何もしない", () => {
    stateMock.streamChunk.CHAT = makeChunk();
    mod.playPendingQuantizeChunk("CHAT");
    expect(quantizePlayMock).not.toHaveBeenCalled();
  });

  test("flag が false のチャンクは playPendingQuantizeChunk で再生しない", () => {
    // ON→OFF→ON の順で pending を立てた直後に flag を落とすケースを模す
    mod.quantizeFromServer({
      CHAT: { quantizeFlag: true, beat: 1, gridFlag: false },
    } as any);
    stateMock.streamChunk.CHAT = makeChunk();
    stateMock.quantizeState.stream.CHAT.flag = false;

    mod.playPendingQuantizeChunk("CHAT");
    expect(quantizePlayMock).not.toHaveBeenCalled();
  });

  test("refreshQuantizeInterval は稼働中かつ reset=false なら再アームしない", () => {
    stateMock.quantizeState.stream.CHAT.flag = true;
    stateMock.quantizeState.interval = 999;

    mod.refreshQuantizeInterval();

    expect(stateMock.quantizeState.interval).toBe(999);
  });

  test("全 flag false なら interval を停止する", () => {
    stateMock.quantizeState.interval = 999;
    stateMock.quantizeState.intervalFlag = true;

    mod.refreshQuantizeInterval();

    expect(stateMock.quantizeState.interval).toBeNull();
    expect(stateMock.quantizeState.intervalFlag).toBe(false);
  });

  test("BPM変更(reset=true)は経過時間を差し引いて位相を保って再アームする", () => {
    stateMock.quantizeState.stream.CHAT.flag = true;
    stateMock.quantizeState.bar = 4000;
    stateMock.streamChunk.CHAT = makeChunk();

    // t=0 に開始（次 tick は 4000ms 後）
    mod.refreshQuantizeInterval();
    quantizePlayMock.mockClear();

    // t=1000 まで進めて BPM 変更（bar 2000）。残り 1000ms で再アームされるはず
    vi.advanceTimersByTime(1000);
    stateMock.quantizeState.bar = 2000;
    mod.refreshQuantizeInterval(true);

    vi.advanceTimersByTime(999);
    expect(quantizePlayMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(quantizePlayMock).toHaveBeenCalledTimes(1);
  });
});
