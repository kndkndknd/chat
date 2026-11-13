import { streamState } from "../../state";
import { loopClearEmit } from "../../socket/ioEmit";

/**
 * LOOP を解除する。stream を省略すると全ストリームを解除する。
 * 解除対象の端末へ loopClearFromServer を送る。
 */
export const clearLoop = (stream?: string): void => {
  // 旧スキーマ(loop: boolean)が Redis に残っている場合の移行
  if (typeof streamState.loop !== "object" || streamState.loop === null) {
    streamState.loop = { CHAT: [], PLAYBACK: [], TIMELAPSE: [] };
    return;
  }

  const streams =
    stream === undefined ? Object.keys(streamState.loop) : [stream];

  for (const name of streams) {
    const targets = [...new Set(streamState.loop[name] ?? [])];
    streamState.loop[name] = [];
    for (const target of targets) {
      loopClearEmit(name, target);
    }
  }
};
