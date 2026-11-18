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

export const pushStateStream = (
  streamName: string,
  // states: cmdStateType,
  random?: boolean
) => {
  if (!streamList.includes(streamName)) {
    streamList.push(streamName);
  }
  currentState.stream[streamName] = false;
  previousState.stream[streamName] = false;
  sampleRateState.sampleRate[streamName] = 44100;
  glitchState.glitch[streamName] = false;
  // streamState.grid[streamName] = true;
  // streamState.latency[streamName] = 1000;
  streamState.random[streamName] = random !== undefined ? random : true;
  sampleRateState.randomrate[streamName] = false;
  streamState.target[streamName] = [];
  streamState.filter[streamName] = defaultFilterState;
  streamState.pa[streamName] = false;

  sampleRateState.randomratemode = "random";
  sampleRateState.randomraterange[streamName] = {
    min: 4000,
    max: 132300,
  };
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
