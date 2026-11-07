import { beforeEach, describe, expect, it, vi } from "vitest";
import { contextState, stereoPannerState } from "../../src/state";
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
      getVoices: () => [],
      onvoiceschanged: null,
    };
    speak.mockClear();
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
    expect(speak).not.toHaveBeenCalled();
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
