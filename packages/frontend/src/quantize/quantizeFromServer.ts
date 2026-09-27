import type { bpmStreamStateType } from "../../../../types";
import { millisecondsPerBar } from "../util/bpmCalc";
import {
  streamFlagState,
  streamChunk,
  quantizeState,
  contextState,
  socketState,
} from "../state";
import { quantizeType } from "../../../../types";
import { quantizePlay } from "./quantizePlay";
import { chatReq } from "../stream";

// 直近のtick時刻(ms)。BPM変更時に経過時間を考慮して次tickを再アームするために使う。
let lastTickAt = 0;
// QUANTIZEをONにした直後に届いた最初のチャンクを、1小節待たずに即再生するためのフラグ（stream単位）。
const pendingFirstPlay: Record<string, boolean> = {};

export const quantizeFromServer = (
  data: bpmStreamStateType,
  bpm?: number,
): quantizeType => {
  if (bpm !== undefined && bpm > 0) {
    quantizeState.bar = millisecondsPerBar(bpm);
  }

  for (const stream in data) {
    if (quantizeState.stream[stream] === undefined) {
      continue;
    }
    const wasQuantize = quantizeState.stream[stream].flag;
    const nextQuantize = data[stream].quantizeFlag;
    quantizeState.stream[stream].flag = nextQuantize;
    quantizeState.stream[stream].beat = data[stream].beat;

    // quantizeがOFFになったら未再生のチャンクを破棄し、CHATなら録音リレーを再開させる。
    // ONの間は受信チャンクを再生せずバッファするだけでchatReqが呼ばれないため、
    // OFF遷移でchatReqしないとCHATの録音/送信ループが止まったままになる。
    if (!wasQuantize && nextQuantize) {
      // ON直後は初回tickが1小節後になるため、最初のチャンクは到着時に即再生する。
      pendingFirstPlay[stream] = true;
    } else if (wasQuantize && !nextQuantize) {
      pendingFirstPlay[stream] = false;
      streamChunk[stream] = {};
      if (stream === "CHAT") {
        chatReq(String(socketState.socketId));
      }
    }
  }
  refreshQuantizeInterval();
  return quantizeState;
};

export const refreshQuantizeInterval = (reset = false): void => {
  const hasQuantizeFlag = Object.keys(quantizeState.stream).some(
    (stream) => quantizeState.stream[stream].flag,
  );

  if (!hasQuantizeFlag) {
    clearInterval(quantizeState.interval);
    quantizeState.interval = null;
    quantizeState.intervalFlag = false;
    return;
  }

  const running = quantizeState.interval !== null;
  if (running && !reset) {
    return;
  }

  clearInterval(quantizeState.interval);

  if (running) {
    // BPM変更: 位相をリセットせず、直近tickからの経過時間ぶんを差し引いた
    // 残り時間で次tickを再アームする（変更が次の小節まで遅れない）。
    const elapsed = Date.now() - lastTickAt;
    scheduleQuantizeTick(Math.max(0, quantizeState.bar - elapsed));
  } else {
    lastTickAt = Date.now();
    scheduleQuantizeTick(quantizeState.bar);
  }
  quantizeState.intervalFlag = true;
};

const scheduleQuantizeTick = (delay: number): void => {
  quantizeState.interval = window.setTimeout(quantizeTick, delay);
};

const quantizeTick = (): void => {
  for (const stream of Object.keys(quantizeState.stream)) {
    if (
      streamFlagState[stream] &&
      streamChunk[stream] !== undefined &&
      streamChunk[stream].audio !== undefined &&
      quantizeState.stream[stream].flag
    ) {
      quantizePlay(streamChunk[stream], quantizeState.stream[stream].beat);
    }
  }
  quantizeState.currentTime = contextState.audioContext?.currentTime ?? 0;
  lastTickAt = Date.now();
  scheduleQuantizeTick(quantizeState.bar);
};

// QUANTIZEをONにした直後にバッファされたチャンクを、初回tickを待たずに即再生する。
// 予約済みの次tickは破棄し、この再生時刻を起点にグリッドを張り直す。
export const playPendingQuantizeChunk = (stream: string): void => {
  if (!pendingFirstPlay[stream]) {
    return;
  }
  const chunk = streamChunk[stream];
  if (
    chunk === undefined ||
    chunk.audio === undefined ||
    !quantizeState.stream[stream]?.flag
  ) {
    return;
  }

  pendingFirstPlay[stream] = false;
  clearInterval(quantizeState.interval);
  quantizeState.interval = null;
  quantizePlay(chunk, quantizeState.stream[stream].beat);
  lastTickAt = Date.now();
  scheduleQuantizeTick(quantizeState.bar);
  quantizeState.intervalFlag = true;
};
