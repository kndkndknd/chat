import { describe, expect, test } from "vitest";
import {
  collectPcmBuffers,
  LIVE_STREAM_SAMPLE_RATE,
} from "../../src/stream/getPcmBuffers";

type SampleCallback = (sample: number, channel?: number) => void;
type EndCallback = (err: unknown, output?: unknown) => void;

describe("collectPcmBuffers", () => {
  test("44100Hz モノラルで抽出し、完了まで待って端数を 0 埋めする", async () => {
    let receivedOptions: { stereo: boolean; sampleRate: number } | undefined;
    const getPcmData = (
      _filePath: string,
      options: { stereo: boolean; sampleRate: number },
      sampleCallback: SampleCallback,
      endCallback: EndCallback,
    ) => {
      receivedOptions = options;
      [1, 2, 3, 4, 5].forEach((sample) => sampleCallback(sample));
      setTimeout(() => endCallback(null, ""), 0);
    };

    const buffers = await collectPcmBuffers(getPcmData, "audio.ts", 2);

    expect(receivedOptions).toEqual({
      stereo: false,
      sampleRate: LIVE_STREAM_SAMPLE_RATE,
    });
    expect(buffers).toHaveLength(3);
    expect(Array.from(buffers[0])).toEqual([1, 2]);
    expect(Array.from(buffers[1])).toEqual([3, 4]);
    expect(Array.from(buffers[2])).toEqual([5, 0]);
  });

  test("pcm がエラーを返したら reject する", async () => {
    const getPcmData = (
      _filePath: string,
      _options: { stereo: boolean; sampleRate: number },
      _sampleCallback: SampleCallback,
      endCallback: EndCallback,
    ) => {
      setTimeout(() => endCallback("ffmpeg error"), 0);
    };

    await expect(
      collectPcmBuffers(getPcmData, "audio.ts", 2),
    ).rejects.toThrow("ffmpeg error");
  });
});
