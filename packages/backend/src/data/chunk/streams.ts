import { streamsRedis, chatsRedis } from "../../redis/streamsRedis";
import { initRecordIndex } from "../../stream/recordEmit";
import { restoreStreamListFromKeys } from "../../stream/restoreStreamState";

export const initStreams = async () => {
  await streamsRedis.initDefaultKeys();
  // 動的に追加されたストリーム（アップロード等）は Redis の streams:keys に
  // 残るが、streamList はプロセスメモリのみ。再起動後もコマンドで扱えるよう
  // 保存済みキーから復元する。CHAT は専用処理、INTERNET は既定の保存キーだが
  // streamList のコマンド対象ではないため除外する。
  const storageOnlyStreams = new Set(["CHAT", "INTERNET"]);
  const savedStreams = await streamsRedis.getAllKeys();
  restoreStreamListFromKeys(
    savedStreams.filter((stream) => !storageOnlyStreams.has(stream)),
  );
  // recordIndex はプロセスメモリ常駐のため、再起動すると 0 に戻る。Redis には過去
  // セッションの recordIndex が残っているので、0 から採番し直すと既存バッファと衝突する
  // （faceDetect の recent 判定や recordIndex 単位の再生グルーピングが壊れる）。
  // 起動時に保存済みの最大 recordIndex + 1 から採番を再開して衝突を防ぐ。
  await initRecordIndex();
};

export { streamsRedis, chatsRedis };
