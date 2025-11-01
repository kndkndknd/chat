import { socketState } from "../state";
import { textPrint } from "../canvasEvent";
export const emitChunk = async (chunk) => {
    if (chunk.size === 0) {
        return;
    }
    try {
        console.log("emitChunk", chunk);
        socketState.socket?.emit("videoFromClient", chunk);
        // const response = await fetch(`${SERVER_URL}/api/ingest`, {
        //   method: "POST",
        //   headers: {
        //     // "Content-Type": chunk.type || "video/webm",
        //     "Content-Type": "video/webm",
        //   },
        //   body: chunk,
        // });
        // if (!response.ok) {
        //   throw new Error(`アップロード失敗: ${response.status}`);
        // }
    }
    catch (error) {
        console.error(error);
        textPrint("アップロード中にエラーが発生しました。録画を停止してください。");
    }
};
