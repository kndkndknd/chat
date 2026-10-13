import { storeVideoBuffer } from "./videoBufferStore";

export const mediaUploadFromClient = async (
  data: { container: string; mimeType: string; blob: ArrayBuffer },
  id: string
): Promise<void> => {
  console.log(
    `mediaUploadFromClient: id=${id} container=${data.container} mimeType=${data.mimeType} size=${data.blob?.byteLength ?? 0}`,
  );
  // 直近の録画を Redis に保持し、PLAYVIDEOBUFFER (videoBufferReqFromClient) で返す。
  await storeVideoBuffer(data);
  // TODO: 録画データの永続化（ファイル保存等）は別途実装
};
