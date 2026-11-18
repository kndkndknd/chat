import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  contextState,
  flagState,
  gainState,
  oscState,
} from "../../../src/state";
import { sinewave } from "../../../src/webaudio/sound/sinewave";
import {
  feedback,
  feedbackLevel,
} from "../../../src/webaudio/sound/feedback";
import { whitenoise } from "../../../src/webaudio/sound/whitenoise";
import { bass } from "../../../src/webaudio/sound/bass";
import { simulate } from "../../../src/webaudio/sound/simulate";

const makeGain = (value = 0) =>
  ({
    value,
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
  }) as any;

describe("グローバル音量チャンネルの発音制御", () => {
  beforeEach(() => {
    contextState.audioContext = { currentTime: 2 } as AudioContext;
    oscState.osc = {
      frequency: { setTargetAtTime: vi.fn(), setValueAtTime: vi.fn() },
    } as any;
    oscState.bassOsc = {
      frequency: { setTargetAtTime: vi.fn(), setValueAtTime: vi.fn() },
    } as any;
    flagState.simulate = false;

    gainState.oscGain = { gain: makeGain() } as any;
    gainState.feedbackGain = { gain: makeGain() } as any;
    gainState.whitenoiseGain = { gain: makeGain() } as any;
    gainState.bassGain = { gain: makeGain() } as any;
    gainState.simulateGain = { gain: makeGain() } as any;
  });

  it("SINEWAVE は発音中/停止だけを切り替える", () => {
    sinewave(true, 440, 0, 0, 0.2);
    expect(gainState.oscGain.gain.setTargetAtTime).toHaveBeenCalledWith(1, 2, 0);
    sinewave(false, 440, 0.1, 0, 0.2);
    expect(gainState.oscGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, 2, 0.1);
  });

  it("FEEDBACK は発音中/停止だけを切り替える", () => {
    feedback(true, 0.1, 0.6);
    expect(gainState.feedbackGain.gain.setTargetAtTime).toHaveBeenCalledWith(
      1,
      2,
      0.1,
    );
    feedback(false, 0.2, 0.6);
    expect(gainState.feedbackGain.gain.setTargetAtTime).toHaveBeenCalledWith(
      0,
      2,
      0.2,
    );
  });

  it("counterbalance は既定ゲイン基準の相対値へ変換する", () => {
    feedbackLevel(0.3, 0.1);
    expect(gainState.feedbackGain.gain.setTargetAtTime).toHaveBeenCalledWith(
      0.5,
      2,
      0.1,
    );
  });

  it("WHITENOISE は発音中/停止だけを切り替える", () => {
    whitenoise(true, 0, 0.5);
    expect(
      gainState.whitenoiseGain.gain.setTargetAtTime,
    ).toHaveBeenCalledWith(1, 2, 0);
    whitenoise(false, 0.1, 0.5);
    expect(
      gainState.whitenoiseGain.gain.setTargetAtTime,
    ).toHaveBeenCalledWith(0, 2, 0.1);
  });

  it("BASS は発音中/停止だけを切り替える", () => {
    bass(true, 1.5);
    expect(gainState.bassGain.gain.setValueAtTime).toHaveBeenCalledWith(1, 0);

    gainState.bassGain.gain.value = 1;
    bass(false, 1.5);
    expect(gainState.bassGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
  });

  it("SIMULATE は発音中/停止だけを切り替える", () => {
    simulate(1);
    expect(gainState.simulateGain.gain.setValueAtTime).toHaveBeenCalledWith(1, 0);

    simulate(1);
    expect(gainState.simulateGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
  });
});
