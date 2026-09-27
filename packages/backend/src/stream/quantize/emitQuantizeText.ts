import { bpmStreamStateType } from "../../../../../types";
import { streamList } from "../../data";
import { stringEmit } from "../../socket/ioEmit";

// QUANTIZE 実行時に、対象クライアントへ有効/無効を textPrint させる。
// フロントは timeout: true で 500ms 後に自動 erasePrint する。
export const emitQuantizeText = (
  quantizeObj: { [client: string]: bpmStreamStateType },
  clients: string[],
  stream?: string,
): void => {
  const streamKey = stream !== undefined && stream ? stream : streamList[0];
  for (const client of clients) {
    if (client === undefined) continue;
    const state = quantizeObj[client]?.[streamKey];
    if (state === undefined) continue;
    stringEmit(`QUANTIZE:${state.quantizeFlag}`, true, client);
  }
};
