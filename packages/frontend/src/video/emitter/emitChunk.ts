import { socketState } from "../../state";
import { textPrint } from "../../canvasEvent";

export const emitChunk = async (chunk: Blob, isFirstChunk: boolean) => {
  if (chunk.size === 0) {
    return;
  }

  try {
    console.log("emitChunk", chunk);
    socketState.socket?.emit("videoFromClient", { chunk, isFirstChunk });
  } catch (error) {
    console.error(error);
    textPrint("アップロード中にエラーが発生しました。録画を停止してください。");
  }
};
