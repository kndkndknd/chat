import { ioState } from "../state/states/ioState";

export const mediaUploadFromClient = (
  data: { container: string; mimeType: string; blob: ArrayBuffer },
  id: string
) => {
  console.log(
    `mediaUploadFromClient: id=${id} container=${data.container} mimeType=${data.mimeType} size=${data.blob?.byteLength ?? 0}`,
  );
  ioState?.io.to(id).emit("mediaRecFromServer", data);
  // TODO: 録画データの永続化（ファイル保存等）は別途実装

};
