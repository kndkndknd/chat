import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emojiState: vi.fn(),
  erasePrint: vi.fn(),
  textPrint: vi.fn(),
  showImage: vi.fn(),
  flickering: vi.fn(),
  drawTile: vi.fn(),
  clearTiles: vi.fn(),
  stopCmd: vi.fn(),
  cmdFromServer: vi.fn(),
  quantizeFromServer: vi.fn(),
  playPendingQuantizeChunk: vi.fn(),
  quantizeParamFromServer: vi.fn(),
  chatReq: vi.fn(),
  recordReqFromServer: vi.fn(),
  streamPlay: vi.fn(),
  playAudioStream: vi.fn(),
  setGainUI: vi.fn(),
  applyGlobalGain: vi.fn(),
  wholeCmd: vi.fn(),
  initFaceDetection: vi.fn(),
  stopFaceDetection: vi.fn(),
  blockFaceDetection: vi.fn(),
  recordAll: vi.fn(),
  uploadRecording: vi.fn(),
  playRecording: vi.fn(),
  bpmFromServer: vi.fn(),
  loopClear: vi.fn(),
  loopToggle: vi.fn(),
  streamReq: vi.fn(),
  voice: vi.fn(),
  mute: vi.fn(),
}));

vi.mock("../../src/canvasEvent", () => ({
  emojiState: mocks.emojiState,
  erasePrint: mocks.erasePrint,
  textPrint: mocks.textPrint,
  showImage: mocks.showImage,
  flickering: mocks.flickering,
  drawTile: mocks.drawTile,
  clearTiles: mocks.clearTiles,
}));
vi.mock("../../src/cmd", () => ({
  stopCmd: mocks.stopCmd,
  cmdFromServer: mocks.cmdFromServer,
}));
vi.mock("../../src/quantize/quantizeFromServer", () => ({
  quantizeFromServer: mocks.quantizeFromServer,
  playPendingQuantizeChunk: mocks.playPendingQuantizeChunk,
}));
vi.mock("../../src/quantize/quantizeParamFromServer", () => ({
  quantizeParamFromServer: mocks.quantizeParamFromServer,
}));
vi.mock("../../src/stream", () => ({
  chatReq: mocks.chatReq,
  recordReqFromServer: mocks.recordReqFromServer,
  streamPlay: mocks.streamPlay,
  playAudioStream: mocks.playAudioStream,
}));
vi.mock("../../src/ui/gainUI", () => ({ setGainUI: mocks.setGainUI }));
vi.mock("../../src/webaudio/params/applyGlobalGain", () => ({
  applyGlobalGain: mocks.applyGlobalGain,
}));
vi.mock("../../src/cmd/wholeCmd", () => ({ wholeCmd: mocks.wholeCmd }));
vi.mock("../../src/faceApi", () => ({
  initFaceDetection: mocks.initFaceDetection,
  stopFaceDetection: mocks.stopFaceDetection,
  blockFaceDetection: mocks.blockFaceDetection,
}));
vi.mock("../../src/mediaRecorder", () => ({
  recordAll: mocks.recordAll,
  uploadRecording: mocks.uploadRecording,
  playRecording: mocks.playRecording,
}));
vi.mock("../../src/quantize/bpmFromServer", () => ({
  bpmFromServer: mocks.bpmFromServer,
}));
vi.mock("../../src/stream/loop/loopToggle", () => ({
  loopClear: mocks.loopClear,
  loopToggle: mocks.loopToggle,
}));
vi.mock("../../src/stream/streamReq", () => ({ streamReq: mocks.streamReq }));
vi.mock("../../src/voice", () => ({ voice: mocks.voice }));
vi.mock("../../src/webaudio", () => ({ mute: mocks.mute }));

import { socket } from "../../src/socket";
import { canvasState, quantizeState, socketState } from "../../src/state";

type Handler = (data?: any) => void;

describe("socket handler wiring", () => {
  const handlers = new Map<string, Handler[]>();
  let fakeSocket: {
    id: string;
    socketId: string;
    on: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };

  const fire = (event: string, data?: any): void => {
    (handlers.get(event) ?? []).forEach((handler) => handler(data));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    fakeSocket = {
      id: "c1",
      socketId: "c1",
      on: vi.fn((event: string, handler: Handler) => {
        handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      }),
      emit: vi.fn(),
    };
    socketState.socket = fakeSocket as any;
    canvasState.stringsClient = "";
    socket();
  });

  afterEach(() => {
    socketState.socket = null as any;
  });

  it("主要なサーバーイベントを登録する", () => {
    const events = fakeSocket.on.mock.calls.map(([event]) => event);

    expect(events).toEqual(
      expect.arrayContaining([
        "connected",
        "cmdFromServer",
        "chatFromServer",
        "streamFromServer",
        "bpmFromServer",
        "loopToggleFromServer",
        "clientSettingsFromServer",
      ]),
    );
  });

  it("connected で gainReqFromClient を送る", () => {
    fire("connected");

    expect(fakeSocket.emit).toHaveBeenCalledWith("gainReqFromClient");
  });

  it("cmdFromServer はコマンドを適用して入力をクリアする", () => {
    canvasState.stringsClient = "ABC";
    const cmd = { cmd: "BASS", flag: true };

    fire("cmdFromServer", cmd);

    expect(mocks.cmdFromServer).toHaveBeenCalledWith(cmd);
    expect(canvasState.stringsClient).toBe("");
  });

  it("loopToggleFromServer / loopClearFromServer は LOOP 状態を更新する", () => {
    fire("loopToggleFromServer", { stream: "PLAYBACK", target: "c1" });
    fire("loopClearFromServer", { stream: "PLAYBACK", target: "c1" });

    expect(mocks.loopToggle).toHaveBeenCalledWith("PLAYBACK", "c1");
    expect(mocks.loopClear).toHaveBeenCalledWith("PLAYBACK", "c1");
  });

  it("muteReqFromServer は mute を更新する", () => {
    fire("muteReqFromServer", { flag: true });

    expect(mocks.mute).toHaveBeenCalledWith(true);
  });

  it("clientSettingsFromServer は顔認識の開始・停止を切り替える", () => {
    mocks.initFaceDetection.mockResolvedValue(undefined);

    fire("clientSettingsFromServer", { facedetection: true, hanged: false });
    expect(mocks.initFaceDetection).toHaveBeenCalledTimes(1);

    fire("clientSettingsFromServer", { facedetection: false, hanged: false });
    expect(mocks.stopFaceDetection).toHaveBeenCalledTimes(1);
  });

  it("bpmFromServer / quantizeFromServer を対応する処理へ渡す", () => {
    const bpm = { bpm: 120, source: ["CHAT"] };
    fire("bpmFromServer", bpm);
    expect(mocks.bpmFromServer).toHaveBeenCalledWith(bpm);

    const quantize = { stream: {} } as any;
    fire("quantizeFromServer", quantize);
    expect(mocks.quantizeFromServer).toHaveBeenCalledWith(quantize);
  });

  it("chatFromServer はストリームを再生して次チャンクを要求する", () => {
    quantizeState.stream.CHAT.flag = false;
    const data = {
      audio: new ArrayBuffer(4),
      sampleRate: 44100,
      glitch: false,
      bufferSize: 8192,
      video: "",
      source: "CHAT",
    };

    fire("chatFromServer", data);

    expect(mocks.streamPlay).toHaveBeenCalledWith(
      "CHAT",
      expect.objectContaining({ source: "CHAT", sampleRate: 44100 }),
    );
    expect(mocks.streamReq).toHaveBeenCalledWith(
      fakeSocket,
      "CHAT",
      expect.objectContaining({ source: "CHAT" }),
      "CHAT",
    );
  });

  it("streamFromServer は対象ストリームのフラグを立てて再生する", () => {
    const data = {
      source: "PLAYBACK",
      audio: new Float32Array(1),
      sampleRate: 44100,
      glitch: false,
      bufferSize: 8192,
    };

    fire("streamFromServer", data);

    expect(mocks.streamPlay).toHaveBeenCalledWith(
      "STREAM",
      expect.objectContaining({ source: "PLAYBACK" }),
    );
  });
});
