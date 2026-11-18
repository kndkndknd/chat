import { audioWorkletState } from "../../state";

type Timer = ReturnType<typeof setTimeout> | null;

const recordTimers: Record<string, Timer> = {};
const recordGenerations: Record<string, number> = {};

// 同じ source の録画リクエストが重なった場合、古いタイマーが新しい録画の
// フラグを落とさないよう、世代番号で最新のタイマーだけを有効にする。
const startRecord = (source: string, timeout: number): void => {
  const generation = (recordGenerations[source] ?? 0) + 1;
  recordGenerations[source] = generation;

  const previous = recordTimers[source];
  if (previous !== null && previous !== undefined) {
    clearTimeout(previous);
  }

  audioWorkletState.chat.flag[source] = true;
  recordTimers[source] = setTimeout(() => {
    if (recordGenerations[source] !== generation) return;
    audioWorkletState.chat.flag[source] = false;
    recordTimers[source] = null;
    console.log(`stop record as ${source}`);
  }, timeout);
};

export const recordReqFromServer = (recordReq: {
  source: string;
  timeout: number;
  index?: number;
}) => {
  console.log("recordReq", recordReq);
  if (
    typeof recordReq?.source !== "string" ||
    !Number.isFinite(recordReq.timeout) ||
    recordReq.timeout <= 0
  ) {
    console.warn("invalid recordReqFromServer data:", recordReq);
    return;
  }

  if (recordReq.source === "PLAYBACK") {
    if (recordReq.index !== undefined) {
      audioWorkletState.chat.recordIndex.PLAYBACK = recordReq.index;
    }
    console.log(`start record as ${recordReq.source}`);
    startRecord(recordReq.source, recordReq.timeout);
    return;
  }

  console.log("other");
  startRecord(recordReq.source, recordReq.timeout);
};
