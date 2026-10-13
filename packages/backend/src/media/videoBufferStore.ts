import { redis } from "../redis/client";

export type videoBufferDataType = {
  container: string;
  mimeType: string;
  blob: ArrayBuffer;
};

// 保存を許可するコンテナ。クライアントから届く container を Redis キーへ
// そのまま使わないよう whitelist で検証する。
export const VIDEO_BUFFER_CONTAINERS = ["webm", "ogg"] as const;

export const isVideoBufferContainer = (
  container: string,
): container is (typeof VIDEO_BUFFER_CONTAINERS)[number] =>
  (VIDEO_BUFFER_CONTAINERS as readonly string[]).includes(container);

// 10 秒録画 (VP9) を想定した blob サイズ上限。これを超えるものは保存しない。
export const MAX_VIDEO_BUFFER_BYTES = 32 * 1024 * 1024;

const videoBufferKey = (container: string) => `videoBuffer:${container}`;

export const serializeVideoBuffer = (data: videoBufferDataType): string => {
  const blobB64 = Buffer.from(data.blob).toString("base64");
  return JSON.stringify({
    container: data.container,
    mimeType: data.mimeType,
    blob: blobB64,
  });
};

export const deserializeVideoBuffer = (raw: string): videoBufferDataType => {
  const obj = JSON.parse(raw);
  const buf = Buffer.from(obj.blob, "base64");
  // Buffer.from(string, "base64") は Node の内部プールからスライスを返すことが
  // あるため、実データ範囲のみを切り出して返す (streamsRedis と同じ理由)。
  return {
    container: obj.container,
    mimeType: obj.mimeType,
    blob: buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer,
  };
};

export const storeVideoBuffer = async (
  data: videoBufferDataType,
): Promise<void> => {
  if (!isVideoBufferContainer(data.container)) {
    throw new Error(`invalid video buffer container: ${data.container}`);
  }
  if (data.blob.byteLength > MAX_VIDEO_BUFFER_BYTES) {
    throw new Error(
      `video buffer too large: ${data.blob.byteLength} bytes (max ${MAX_VIDEO_BUFFER_BYTES})`,
    );
  }
  await redis.set(videoBufferKey(data.container), serializeVideoBuffer(data));
  console.log(
    `videoBufferStore: container=${data.container} mimeType=${data.mimeType} size=${data.blob?.byteLength ?? 0}`,
  );
};

// 再生用に WebM を優先して返す (Ogg はブラウザ対応が限られるため)。
export const getVideoBuffer = async (): Promise<videoBufferDataType | null> => {
  for (const container of VIDEO_BUFFER_CONTAINERS) {
    const raw = await redis.get(videoBufferKey(container));
    if (raw !== null) return deserializeVideoBuffer(raw);
  }
  return null;
};

// REDIS CLEAR 時に保持中の録画を破棄する。
export const clearVideoBuffer = async (): Promise<void> => {
  await redis.del(...VIDEO_BUFFER_CONTAINERS.map(videoBufferKey));
};
