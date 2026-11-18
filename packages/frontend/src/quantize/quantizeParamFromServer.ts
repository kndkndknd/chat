import type { bpmStreamStateType } from "../../../../types";
import { ensureQuantizeStream } from "./quantizeStream";
import { textPrint } from "../canvasEvent";

export const quantizeParamFromServer = (data:bpmStreamStateType, streams: string[]): void => { 
  for (const stream of streams) {
    const streamData = data[stream];
    if (streamData === undefined) {
      continue;
    }
    // BEAT で指定された stream がまだ quantizeState に無い場合も登録する。
    ensureQuantizeStream(stream, streamData.beat).beat = streamData.beat;
  }
  textPrint(`BEAT: ${data['CHAT']?.beat ?? ''}`, { timeout: true })
};
