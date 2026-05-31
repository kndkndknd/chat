import { ioState } from "../state/states/ioState";
import { currentState, cmdState } from "../state";
import { pushStateStream } from "./pushStateStream";
import { streamsRedis } from "../redis/streamsRedis";

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

export const recordEmit = (target?: string) => {
  console.log("target", target);
  // if (!currentState.RECORD) {
  currentState.RECORD = true;
  const index = recordIndex;
  if (target && target !== undefined) {
    console.log(`target: ${target}`);
    ioState?.io.to(target).emit("recordReqFromServer", {
      source: "PLAYBACK",
      timeout: RECORD_TIMEOUT_MS,
      index,
    });
  } else {
    console.log("all");
    ioState?.io.emit("recordReqFromServer", {
      source: "PLAYBACK",
      timeout: RECORD_TIMEOUT_MS,
      index,
    });
  }
  recordIndex++;
  // クライアントは timeout で録画を止めるので、同じタイミングで RECORD を戻す。
  // これを戻さないと faceDetectScenario の RECORD ガードに永久に弾かれ、
  // 2回目以降の顔認識で recordEmit が送られなくなる。
  setTimeout(() => {
    currentState.RECORD = false;
  }, RECORD_TIMEOUT_MS);
  if (cmdState.VOICE.length > 0) {
    cmdState.VOICE.forEach((element) => {
      //          io.to(element).emit('voiceFromServer', 'RECORD')
      ioState?.io.to(element).emit("voiceFromServer", {
        text: "RECORD",
        lang: cmdState.voiceLang,
      });
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
    pushStateStream(source);
    if (target && target !== undefined) {
      console.log(`target: ${target}`);
      ioState?.io.to(target).emit("recordReqFromServer", {
        source: source,
        timeout: 10000,
      });
    } else {
      console.log("all");
      ioState?.io.emit("recordReqFromServer", { source: source, timeout: 10000 });
    }
    if (cmdState.VOICE.length > 0) {
      cmdState.VOICE.forEach((element) => {
        //          io.to(element).emit('voiceFromServer', 'RECORD')
        ioState?.io.to(element).emit("voiceFromServer", {
          text: source,
          lang: cmdState.voiceLang,
        });
      });
    }
  } else {
    console.log(`stop record as ${source}`);
    currentState.RECORD = false;
  }
};
