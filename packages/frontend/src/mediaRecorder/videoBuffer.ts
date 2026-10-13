import { socketState, streamState } from "../state";
import { recordAll } from "./recorder";
import { uploadRecording } from "./upload";

// VIDEOBUFFER コマンド 1 回につき録画する固定長(ms)。
const VIDEO_BUFFER_DURATION_MS = 10000;

/**
 * 内蔵マイク + Web カメラの映像/音声を MediaRecorder で録画し、
 * WebSocket (mediaUploadFromClient) でサーバへ送信する。
 * 録画には initialize() が取得済みの streamState.stream を再利用し、
 * 録画後もトラックは停止しない (他の機能と共有しているため)。
 */
export async function videoBuffer(): Promise<void> {
  const stream = streamState.stream;
  if (stream === null) {
    console.warn("[videoBuffer] streamState.stream is not ready");
    return;
  }
  try {
    const recordings = await recordAll(stream, VIDEO_BUFFER_DURATION_MS);
    for (const recording of recordings) {
      await uploadRecording(recording, socketState.socket);
    }
  } catch (err) {
    console.error("[videoBuffer] recording failed:", err);
  }
}

/**
 * PLAYVIDEOBUFFER 受信時に、バックエンドが保持している直近の録画を要求する。
 * 応答は mediaRecFromServer として届き、socket.ts のハンドラが
 * playRecording で再生する。
 */
export function requestVideoBuffer(): void {
  socketState.socket.emit("videoBufferReqFromClient");
}
