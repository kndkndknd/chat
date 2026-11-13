const pcm = require("pcm");

// GET LIVESTREAM の音声は 44100Hz モノラルで抽出し、再生側と一致させる。
export const LIVE_STREAM_SAMPLE_RATE = 44100;

type PcmSampleCallback = (sample: number, channel?: number) => void;
type PcmEndCallback = (err: unknown, output?: unknown) => void;
type GetPcmData = (
  filePath: string,
  options: { stereo: boolean; sampleRate: number },
  sampleCallback: PcmSampleCallback,
  endCallback: PcmEndCallback,
) => void;

/**
 * PCM 抽出のコールバックを bufferSize frames ごとの Float32Array にまとめる。
 * getPcmData を注入可能にして、抽出完了待ちの挙動をテストできるようにする。
 */
export const collectPcmBuffers = (
  getPcmData: GetPcmData,
  filePath: string,
  bufferSize: number,
): Promise<Float32Array[]> => {
  if (!Number.isInteger(bufferSize) || bufferSize <= 0) {
    return Promise.reject(
      new Error(`invalid PCM buffer size: ${bufferSize}`),
    );
  }

  return new Promise((resolve, reject) => {
    const buffers: Float32Array[] = [];
    let current = new Float32Array(bufferSize);
    let index = 0;

    try {
      getPcmData(
        filePath,
        { stereo: false, sampleRate: LIVE_STREAM_SAMPLE_RATE },
        (sample: number) => {
          current[index++] = sample;
          if (index === bufferSize) {
            buffers.push(current);
            current = new Float32Array(bufferSize);
            index = 0;
          }
        },
        (err: unknown) => {
          if (err) {
            reject(new Error(String(err)));
            return;
          }
          if (index > 0) {
            // 最後のチャンクは残りを 0 で埋めて bufferSize を揃える。
            buffers.push(current);
          }
          resolve(buffers);
        },
      );
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * node-pcm のコールバック API を Promise 化し、PCM 抽出の完了まで待つ。
 * 抽出結果は streamState.basisBufferSize と同じ frames 数の Float32Array で返す。
 */
export const getPcmBuffers = (
  filePath: string,
  bufferSize: number,
): Promise<Float32Array[]> =>
  collectPcmBuffers(
    (path, options, sampleCallback, endCallback) => {
      pcm.getPcmData(path, options, sampleCallback, endCallback);
    },
    filePath,
    bufferSize,
  );
