import { streamsRedis, chatsRedis } from "../../redis/streamsRedis";
import { initRecordIndex } from "../../stream/recordEmit";

export const initStreams = async () => {
  await streamsRedis.initDefaultKeys();
  // recordIndex はプロセスメモリ常駐のため、再起動すると 0 に戻る。Redis には過去
  // セッションの recordIndex が残っているので、0 から採番し直すと既存バッファと衝突する
  // （faceDetect の recent 判定や recordIndex 単位の再生グルーピングが壊れる）。
  // 起動時に保存済みの最大 recordIndex + 1 から採番を再開して衝突を防ぐ。
  await initRecordIndex();
};

export { streamsRedis, chatsRedis };
