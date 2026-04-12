// import { canvasElement } from "../../canvasEvent/canvasElement";
// import { text } from "stream/consumers";
import { textPrint, erasePrint, canvasElement } from "../../canvasEvent";
import { videoBufferState } from "../../state";
import { emitChunk } from "./emitChunk";

const SERVER_URL = "https://localhost:8888";

let uploadChain = Promise.resolve();
const mediaRecorderOptions: MediaRecorderOptions = {
  mimeType: "video/webm;codecs=vp8,opus",
  videoBitsPerSecond: 1_000_000,
};

export const emitCtrl = (mediaStream: MediaStream) => {
  console.log("videoBufferState:", videoBufferState);
  if (!videoBufferState.ready) {
    videoBufferState.mediaRecorder = new MediaRecorder(
      mediaStream,
      mediaRecorderOptions,
    );
    videoBufferState.ready = true;
  }
  if (!videoBufferState.recording && videoBufferState.mediaRecorder) {
    videoBufferState.mediaRecorder.addEventListener(
      "dataavailable",
      (event) => {
        const { data } = event;
        uploadChain = uploadChain.then(() => {
          emitChunk(data, videoBufferState.firstChunkFlag);
          videoBufferState.firstChunkFlag = videoBufferState.firstChunkFlag
            ? false
            : true;
        });
      },
    );
    textPrint("VIDEO RECORDING");
    videoBufferState.recording = true;
    videoBufferState.mediaRecorder.start(1000);
    setTimeout(() => {
      if (
        videoBufferState.mediaRecorder &&
        videoBufferState.mediaRecorder.state === "recording"
      ) {
        videoBufferState.mediaRecorder.stop();
        videoBufferState.recording = false;
        erasePrint();
      }
    }, 30000); // 30秒後に自動停止
  }
};

// const postChunk = async (chunk: Blob) => {
//   if (chunk.size === 0) {
//     return;
//   }

//   try {
//     console.log(chunk);
//     const response = await fetch(`${SERVER_URL}/api/ingest`, {
//       method: "POST",
//       headers: {
//         // "Content-Type": chunk.type || "video/webm",
//         "Content-Type": "video/webm",
//       },
//       body: chunk,
//     });

//     if (!response.ok) {
//       throw new Error(`アップロード失敗: ${response.status}`);
//     }
//   } catch (error) {
//     console.error(error);
//     textPrint("アップロード中にエラーが発生しました。録画を停止します");
//     // stopRecording().catch((err) => console.error(err));
//     videoBufferState.recording = false;
//   }
// };
