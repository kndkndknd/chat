import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  contextState,
  flagState,
  gainState,
  stereoPannerState,
} from "../../src/state";
import { voice } from "../../src/voice";

class MockUtterance {
  lang = "";
  text = "";
  volume = 1;
  voice: unknown = null;
}

describe("voice", () => {
  const speak = vi.fn();

  beforeEach(() => {
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
    (globalThis as any).speechSynthesis = {
      speak,
      cancel: vi.fn(),
      getVoices: () => [],
      onvoiceschanged: null,
    };
    speak.mockClear();
    flagState.mute = false;
    gainState.masterGain = { gain: { value: 1 } } as any;
    stereoPannerState.masterPannerParam = 0;
    stereoPannerState.masterPanner = null;
    contextState.audioContext = null;
  });

  it("パンなしは speechSynthesis を使う", async () => {
    const fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    await voice({ text: "HELLO", lang: "en-US" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("20文字未満の空白なしテキストは1文字ずつ区切らない", async () => {
    (globalThis as any).fetch = vi.fn();
    const text = "A".repeat(19);

    await voice({ text, lang: "en-US" });

    expect(speak.mock.calls[0][0].text).toBe(text);
  });

  it("20文字以上の空白なしテキストは1文字ずつ区切る", async () => {
    (globalThis as any).fetch = vi.fn();
    const text = "A".repeat(20);

    await voice({ text, lang: "en-US" });

    expect(speak.mock.calls[0][0].text).toBe(text.split("").join(" "));
  });

  it("20文字以上でも半角スペースを含むテキストは区切らない", async () => {
    (globalThis as any).fetch = vi.fn();
    const text = "HELLO WORLD HELLO WORLD";

    await voice({ text, lang: "en-US" });

    expect(speak.mock.calls[0][0].text).toBe(text);
  });

  it("英語は標準的な女性音声 (Samantha) を優先する", async () => {
    const albert = { name: "Albert", lang: "en-US" };
    const samantha = { name: "Samantha", lang: "en-US" };
    (globalThis as any).speechSynthesis.getVoices = () => [albert, samantha];
    (globalThis as any).fetch = vi.fn();

    await voice({ text: "HELLO", lang: "en-US" });

    expect(speak.mock.calls[0][0].voice).toBe(samantha);
  });

  it("同一言語に優先音声がなければ英語の女性音声を使う", async () => {
    const daniel = { name: "Daniel", lang: "en-GB" };
    const samantha = { name: "Samantha", lang: "en-US" };
    (globalThis as any).speechSynthesis.getVoices = () => [daniel, samantha];
    (globalThis as any).fetch = vi.fn();

    await voice({ text: "HELLO", lang: "en-GB" });

    expect(speak.mock.calls[0][0].voice).toBe(samantha);
  });

  it("パンありは /api/voice の音声を Web Audio で再生する", async () => {
    stereoPannerState.masterPannerParam = -1;
    stereoPannerState.masterPanner = { connect: vi.fn() } as any;
    const start = vi.fn();
    const source = { buffer: null as AudioBuffer | null, connect: vi.fn(), start };
    const gain = { gain: { value: 1 }, connect: vi.fn() };
    contextState.audioContext = {
      state: "running",
      resume: vi.fn(),
      decodeAudioData: (_data: ArrayBuffer, success: (buffer: AudioBuffer) => void) => {
        success({} as AudioBuffer);
      },
      createBufferSource: () => source,
      createGain: () => gain,
    } as any;

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "audio/wav" },
      arrayBuffer: async () => new ArrayBuffer(4),
    }));
    (globalThis as any).fetch = fetchMock;

    await voice({ text: "HELLO", lang: "en-US", volume: 0.5 });

    expect(fetchMock).toHaveBeenCalledWith("/api/voice?text=HELLO&lang=en-US");
    expect(start).toHaveBeenCalledTimes(1);
    expect(gain.gain.value).toBe(0.5);
    expect(gain.connect).toHaveBeenCalledWith(gainState.masterGain);
    expect(speak).not.toHaveBeenCalled();
  });

  it("speechSynthesis の音量に MASTER を掛ける", async () => {
    (globalThis as any).fetch = vi.fn();
    gainState.masterGain = { gain: { value: 0.5 } } as any;

    await voice({ text: "HELLO", lang: "en-US", volume: 0.5 });

    expect(speak.mock.calls[0][0].volume).toBe(0.25);
  });

  it("MASTER が 0 なら speechSynthesis を開始しない", async () => {
    (globalThis as any).fetch = vi.fn();
    gainState.masterGain = { gain: { value: 0 } } as any;

    await voice({ text: "HELLO", lang: "en-US" });

    expect(speak).not.toHaveBeenCalled();
  });

  it("英語も中央パンではサーバーTTSを使わず speechSynthesis を使う", async () => {
    stereoPannerState.masterPannerParam = 0;
    stereoPannerState.masterPanner = { connect: vi.fn() } as any;
    contextState.audioContext = {} as any;
    const fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    await voice({ text: "HELLO", lang: "en-US" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].lang).toBe("en-US");
  });

  it("MUTE 中は中央パンの speechSynthesis を実行しない", async () => {
    flagState.mute = true;
    (globalThis as any).fetch = vi.fn();

    await voice({ text: "HELLO", lang: "en-US" });

    expect(speak).not.toHaveBeenCalled();
  });

  it("日本語は中央パンでは speechSynthesis を使う", async () => {
    stereoPannerState.masterPannerParam = 0;
    stereoPannerState.masterPanner = { connect: vi.fn() } as any;
    contextState.audioContext = {} as any;
    const fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    await voice({ text: "こんにちは", lang: "ja-JP" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("サーバーTTSが失敗したら speechSynthesis にフォールバックする", async () => {
    stereoPannerState.masterPannerParam = 1;
    stereoPannerState.masterPanner = { connect: vi.fn() } as any;
    contextState.audioContext = {} as any;
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
    }));

    await voice({ text: "HELLO", lang: "en-US" });

    expect(speak).toHaveBeenCalledTimes(1);
  });
});
