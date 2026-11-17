import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execCmd: vi.fn(),
  execSinewave: vi.fn(),
  voiceEmit: vi.fn(),
  stringEmit: vi.fn(),
  emojiEmit: vi.fn(),
  torchCmdEmit: vi.fn(),
  portamentChange: vi.fn(),
  sampleRateChange: vi.fn(),
  glitchChange: vi.fn(),
  gridChange: vi.fn(),
  randomStreamOrder: vi.fn(),
  voiceChange: vi.fn(),
  setMute: vi.fn(),
  loopToggle: vi.fn(),
  sinewaveChange: vi.fn(),
  m5Switch: vi.fn(),
}));

vi.mock("../../src/socket/ioEmit", () => ({
  beatEmit: vi.fn(),
  bpmEmit: vi.fn(),
  chatEmit: vi.fn(),
  chatReqEmit: vi.fn(),
  clientSettingEmit: vi.fn(),
  cmdEmit: vi.fn(),
  emitChangeBPM: vi.fn(),
  emojiEmit: mocks.emojiEmit,
  erasePrintEmit: vi.fn(),
  loopClearEmit: vi.fn(),
  loopToggleEmit: vi.fn(),
  mediaRecReqEmit: vi.fn(),
  muteReqEmit: vi.fn(),
  quantizeEmit: vi.fn(),
  recordReqEmit: vi.fn(),
  relayAnswerEmit: vi.fn(),
  relayIceEmit: vi.fn(),
  relayOfferEmit: vi.fn(),
  relayReceiverJoinedEmit: vi.fn(),
  relayReceiverLeftEmit: vi.fn(),
  relayRoomFullEmit: vi.fn(),
  relaySenderGoneEmit: vi.fn(),
  stopEmit: vi.fn(),
  streamEmit: vi.fn(),
  stringEmit: mocks.stringEmit,
  tileClearEmit: vi.fn(),
  timelapseEmit: vi.fn(),
  torchCmdEmit: mocks.torchCmdEmit,
  videoBufferEmit: vi.fn(),
  voiceEmit: mocks.voiceEmit,
  voskCallEmit: vi.fn(),
  wholeCmdEmit: vi.fn(),
}));
vi.mock("../../src/cmd/execCmd", () => ({ execCmd: mocks.execCmd }));
vi.mock("../../src/cmd/execSinewave", () => ({ execSinewave: mocks.execSinewave }));
vi.mock("../../src/parameterChange/portamentChange", () => ({
  portamentChange: mocks.portamentChange,
}));
vi.mock("../../src/parameterChange/sampleRateChange", () => ({
  sampleRateChange: mocks.sampleRateChange,
}));
vi.mock("../../src/parameterChange/glitchChange", () => ({
  glitchChange: mocks.glitchChange,
}));
vi.mock("../../src/bpm/gridChange", () => ({ gridChange: mocks.gridChange }));
vi.mock("../../src/parameterChange/randomStreamOrder", () => ({
  randomStreamOrder: mocks.randomStreamOrder,
}));
vi.mock("../../src/parameterChange/voiceChange", () => ({
  voiceChange: mocks.voiceChange,
}));
vi.mock("../../src/cmd/mute", () => ({ setMute: mocks.setMute }));
vi.mock("../../src/stream/loop/loopToggle", () => ({
  loopToggle: mocks.loopToggle,
}));
vi.mock("../../src/cmd/sinewaveChange", () => ({
  sinewaveChange: mocks.sinewaveChange,
}));
vi.mock("../../src/rotate/m5Access", () => ({ m5Switch: mocks.m5Switch }));

import { execEnter } from "../../src/cmd/execEnter";
import { clientState } from "../../src/state/states/clientState";
import { flagState } from "../../src/state/states/flagState";
import { streamState } from "../../src/state/states/streamState";

const SOLFEGGIO_FREQUENCIES = [285, 396, 417, 528, 639, 741, 852, 963];

describe("execEnter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagState.emoji = false;
    clientState.client = {};
    clientState.sinewaveClient = [];
    Object.values(streamState.filter).forEach((filter) => {
      filter.flag = false;
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("SOLFEGGIO はソルフェジオ周波数から1つ選んで再生する", async () => {
    await execEnter("SOLFEGGIO", "all");

    expect(mocks.execSinewave).toHaveBeenCalledTimes(1);
    expect(SOLFEGGIO_FREQUENCIES).toContain(
      mocks.execSinewave.mock.calls[0][0],
    );
    expect(mocks.execSinewave).toHaveBeenCalledWith(285);
  });

  it("cmdList のコマンドは execCmd へ渡す", async () => {
    await execEnter("BASS", "all");

    expect(mocks.voiceEmit).toHaveBeenCalledWith("BASS", "all");
    expect(mocks.execCmd).toHaveBeenCalledWith("BASS");
  });

  it("パラメータコマンドは対応する変更関数へ渡す", async () => {
    await execEnter("PORTAMENT", "c1");

    expect(mocks.portamentChange).toHaveBeenCalledWith({ source: "c1" });
  });

  it("FILTER は全ストリームのフラグを反転する", async () => {
    await execEnter("FILTER", "c1");

    expect(
      Object.values(streamState.filter).every((filter) => filter.flag),
    ).toBe(true);
    expect(mocks.stringEmit).toHaveBeenCalledWith("FILTER: TOGGLED", true);
  });

  it("FUSEJI / EMOJI はフラグを反転して送信する", async () => {
    await execEnter("FUSEJI", "c1");
    expect(flagState.emoji).toBe(true);
    expect(mocks.emojiEmit).toHaveBeenCalledWith(true);

    await execEnter("EMOJI", "c1");
    expect(flagState.emoji).toBe(false);
    expect(mocks.emojiEmit).toHaveBeenCalledWith(false);
  });

  it("MUTE / UNMUTE は setMute へ渡す", async () => {
    await execEnter("MUTE", "c1");
    expect(mocks.setMute).toHaveBeenCalledWith(true);

    await execEnter("UNMUTE", "c1");
    expect(mocks.setMute).toHaveBeenCalledWith(false);
  });

  it("PREVIOUS は cmdList 経由で execCmd へ渡す", async () => {
    await execEnter("PREVIOUS", "c1");

    expect(mocks.voiceEmit).toHaveBeenCalledWith("PREVIOUS", "c1");
    expect(mocks.execCmd).toHaveBeenCalledWith("PREVIOUS");
  });

  it("TWICE / HALF は sinewaveChange へ渡す", async () => {
    await execEnter("TWICE", "c1");
    expect(mocks.sinewaveChange).toHaveBeenCalledWith("TWICE");

    await execEnter("HALF", "c1");
    expect(mocks.sinewaveChange).toHaveBeenCalledWith("HALF");
  });

  it("SELF は対象クライアントのフラグを反転する", async () => {
    clientState.client.c1 = { index: 1, self: false } as any;

    await execEnter("SELF", "c1");

    expect(clientState.client.c1.self).toBe(true);
    expect(mocks.stringEmit).toHaveBeenCalledWith("SELF true", true, "c1");
  });

  it("NUMBER は各クライアントの index を表示する", async () => {
    clientState.client.c1 = { index: 1 } as any;

    await execEnter("NUMBER", "c1");

    expect(mocks.stringEmit).toHaveBeenCalledWith("1", true, "c1");
  });
});
