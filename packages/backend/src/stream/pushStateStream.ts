import {
  streamState,
  currentState,
  previousState,
  sampleRateState,
  glitchState,
  clientState,
  bpmState,
  defaultFilterState,
} from "../state";
import { streamList } from "../data";

// 新規ストリームのキーだけを初期化する。
// 既存ストリームに対して呼ばれても、ユーザーが設定した値
// （randomrate / randomraterange / sampleRate / filter など）は上書きしない。
export const pushStateStream = (
  streamName: string,
  // states: cmdStateType,
  random?: boolean
) => {
  if (!streamList.includes(streamName)) {
    streamList.push(streamName);
  }
  if (currentState.stream[streamName] === undefined) {
    currentState.stream[streamName] = false;
  }
  if (previousState.stream[streamName] === undefined) {
    previousState.stream[streamName] = false;
  }
  if (sampleRateState.sampleRate[streamName] === undefined) {
    sampleRateState.sampleRate[streamName] = 44100;
  }
  if (glitchState.glitch[streamName] === undefined) {
    glitchState.glitch[streamName] = false;
  }
  // streamState.grid[streamName] = true;
  // streamState.latency[streamName] = 1000;
  if (streamState.random[streamName] === undefined) {
    streamState.random[streamName] = random !== undefined ? random : true;
  }
  if (sampleRateState.randomrate[streamName] === undefined) {
    sampleRateState.randomrate[streamName] = false;
  }
  if (streamState.target[streamName] === undefined) {
    streamState.target[streamName] = [];
  }
  if (streamState.filter[streamName] === undefined) {
    streamState.filter[streamName] = defaultFilterState;
  }
  if (streamState.pa[streamName] === undefined) {
    streamState.pa[streamName] = false;
  }

  // randomratemode は全ストリーム共通の設定。ストリーム追加では変更せず、
  // 新規ストリームは現在のモードを継承する。
  if (sampleRateState.randomraterange[streamName] === undefined) {
    sampleRateState.randomraterange[streamName] = {
      min: 4000,
      max: 132300,
    };
  }
  // bpmState.stream[streamName] = {};
  for (const client in bpmState) {
    // 既に同じ stream が登録されている場合は、QUANTIZE / BEAT の設定を
    // 保持する（chatReceive 等で同じ source が繰り返し届くケースがある）。
    if (bpmState[client].stream[streamName] === undefined) {
      bpmState[client].stream[streamName] = {
        beat: 0,
        gridFlag: true,
        quantizeFlag: false,
      };
    }
  }
};
