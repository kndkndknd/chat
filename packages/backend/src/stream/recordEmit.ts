import { currentState, cmdState } from "../state";
import { pushStateStream } from "./pushStateStream";
import { streamsRedis } from "../redis/streamsRedis";
import { recordReqEmit, voiceEmit } from "../socket/ioEmit";

let recordIndex = 0;

export const getRecordIndex = (): number => recordIndex;

// サーバ起動時に呼ぶ。recordIndex はプロセスメモリ常駐のため、再起動すると 0 に戻る。
// 一方 Redis には過去セッションの recordIndex が残っているので、そのまま 0 から
// 採番し直すと既存バッファと index が衝突する（recent 判定や再生グルーピングが壊れる）。
// 起動時に保存済みの最大 recordIndex + 1 から再開して衝突を防ぐ。
export const initRecordIndex = async (): Promise<void> => {
  try {
    const max = await streamsRedis.getMaxRecordIndex("PLAYBACK");
    recordIndex = max === null ? 0 : max + 1;
    console.log(
      `[initRecordIndex] restored recordIndex = ${recordIndex} (stored max = ${max})`,
    );
  } catch (e) {
    console.error("[initRecordIndex] failed, fallback to 0", e);
    recordIndex = 0;
  }
};

const RECORD_TIMEOUT_MS = 10000;

// 複数の録画リクエストが重なった場合、古いタイマーが新しい録画の
// RECORD フラグを落とさないよう、世代番号で最新のタイマーだけを有効にする。
let recordTimer: NodeJS.Timeout | null = null;
let recordGeneration = 0;

const scheduleRecordEnd = (): void => {
  const generation = ++recordGeneration;
  if (recordTimer !== null) {
    clearTimeout(recordTimer);
  }
  recordTimer = setTimeout(() => {
    if (recordGeneration !== generation) return;
    recordTimer = null;
    currentState.RECORD = false;
  }, RECORD_TIMEOUT_MS);
};

export const cancelRecordTimer = (): void => {
  if (recordTimer !== null) {
    clearTimeout(recordTimer);
    recordTimer = null;
  }
  recordGeneration++;
  currentState.RECORD = false;
};

export const recordEmit = (target?: string, textPrint?: boolean) => {
  console.log("target", target);
  // if (!currentState.RECORD) {
  currentState.RECORD = true;
  const index = recordIndex;
  if (target && target !== undefined) {
    console.log(`target: ${target}`);
    recordReqEmit({source: "PLAYBACK", timeout: RECORD_TIMEOUT_MS, index: index, textPrint: textPrint ?? true}, target);
  } else {
    console.log("all");
    recordReqEmit({source: "PLAYBACK", timeout: RECORD_TIMEOUT_MS, index: index});
  }
  recordIndex++;
  // クライアントは timeout で録画を止めるので、同じタイミングで RECORD を戻す。
  // 連続リクエスト時は古いタイマーを破棄し、最新の録画終了時だけ戻す。
  scheduleRecordEnd();
  if (cmdState.VOICE.length > 0) {
    cmdState.VOICE.forEach((element) => {
      //          io.to(element).emit('voiceFromServer', 'RECORD')
      voiceEmit("RECORD", element);
    });
  }
  //     setTimeout(() => {
  //       currentState.RECORD = false;
  //     }, 10000);
  //   } else {
  //     currentState.RECORD = false;
  //   }
};

export const recordAsOtherEmit = (
  // state: cmdStateType,
  source: string,
  target?: string,
) => {
  console.log("target", target);
  if (!currentState.RECORD) {
    console.log(`start record as ${source}`);
    currentState.RECORD = true;
    scheduleRecordEnd();
    pushStateStream(source);
    if (target && target !== undefined) {
      console.log(`target: ${target}`);
      recordReqEmit({source: source, timeout: 10000}, target);
    } else {
      console.log("all");
      recordReqEmit({source: source, timeout: 10000});
    }
    if (cmdState.VOICE.length > 0) {
      cmdState.VOICE.forEach((element) => {
        //          io.to(element).emit('voiceFromServer', 'RECORD')
        voiceEmit(source, element);
      });
    }
  } else {
    console.log(`stop record as ${source}`);
    cancelRecordTimer();
  }
};
