import { afterEach, describe, expect, test, vi } from "vitest";
import {
  SYNTH_NOTES,
  pickSynthFrequency,
  resolveSynthFrequency,
  stopSynth,
  synth,
} from "../../../src/webaudio/sound/synth";
import { contextState } from "../../../src/state/webAudio/contextState";
import { synthState } from "../../../src/state/webAudio/synthState";

const param = () => ({
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
});

const gainNode = () => ({ gain: param(), connect: vi.fn() });
const sourceNode = () => ({
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

const makeContext = () => {
  const oscillators: Array<{ frequency: ReturnType<typeof param> }> = [];
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    oscillators,
    createGain: vi.fn(gainNode),
    createBiquadFilter: vi.fn(() => ({
      type: "",
      frequency: param(),
      Q: param(),
      connect: vi.fn(),
    })),
    createWaveShaper: vi.fn(() => ({
      curve: null,
      oversample: "",
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => {
      const osc = {
        type: "",
        frequency: param(),
        detune: param(),
        ...sourceNode(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      ...sourceNode(),
    })),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(16),
    })),
    createStereoPanner: vi.fn(() => ({
      pan: param(),
      connect: vi.fn(),
    })),
  };
  return ctx;
};

describe("synth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.clearAllTimers();
    synthState.activeVoices.clear();
    synthState.input = null;
    synthState.wet = null;
    contextState.audioContext = null;
  });

  test("pickSynthFrequency は SYNTH_NOTES から 1 音を返す", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickSynthFrequency()).toBe(SYNTH_NOTES[0]);

    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(pickSynthFrequency()).toBe(SYNTH_NOTES[SYNTH_NOTES.length - 1]);
  });

  test("resolveSynthFrequency は 20〜20000Hz のみ受け付ける", () => {
    expect(resolveSynthFrequency(440)).toBe(440);
    expect(resolveSynthFrequency(20)).toBe(20);
    expect(resolveSynthFrequency(20000)).toBe(20000);
    expect(resolveSynthFrequency(19)).toBeUndefined();
    expect(resolveSynthFrequency(20001)).toBeUndefined();
    expect(resolveSynthFrequency(Number.NaN)).toBeUndefined();
    expect(resolveSynthFrequency(undefined)).toBeUndefined();
  });

  test("AudioContext が無いとき synth / stopSynth は何もしない", () => {
    expect(() => synth()).not.toThrow();
    expect(() => stopSynth()).not.toThrow();
  });

  test("AudioContext があるときボイスを生成し、stopSynth で停止する", () => {
    vi.useFakeTimers();
    const ctx = makeContext();
    contextState.audioContext = ctx as unknown as AudioContext;
    synthState.input = gainNode() as unknown as GainNode;
    synthState.wet = gainNode() as unknown as GainNode;

    synth(undefined, 0.5);

    expect(synthState.activeVoices.size).toBe(1);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(ctx.createStereoPanner).toHaveBeenCalledTimes(1);

    stopSynth(0.01);

    expect(synthState.activeVoices.size).toBe(0);
    expect(synthState.input.gain.setTargetAtTime).toHaveBeenCalled();
  });

  test("指定周波数をメインオシレータに反映する", () => {
    vi.useFakeTimers();
    const ctx = makeContext();
    contextState.audioContext = ctx as unknown as AudioContext;
    synthState.input = gainNode() as unknown as GainNode;
    synthState.wet = gainNode() as unknown as GainNode;

    synth(440, 0.5);

    expect(ctx.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
      440 * 0.97,
      expect.any(Number),
    );
    expect(ctx.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(
      440,
      expect.any(Number),
    );
  });
});
