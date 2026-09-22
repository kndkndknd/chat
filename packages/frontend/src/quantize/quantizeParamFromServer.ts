import type { bpmStreamStateType } from "../../../../types";
import { quantizeState } from "../state";
import { textPrint } from "../canvasEvent";

export const quantizeParamFromServer = (data:bpmStreamStateType, streams: string[]): void => { 
  for ( const stream in quantizeState.stream) {
    if(streams.includes(stream) && data[stream] !== undefined) {
      quantizeState.stream[stream].beat = data[stream].beat;
    }
  }
  textPrint(`BEAT: ${data['CHAT']?.beat ?? ''}`, { timeout: true })
};
