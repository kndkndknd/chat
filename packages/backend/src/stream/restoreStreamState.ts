import { streamList } from "../data/list/streamList";
import {
  bpmState,
  bpmStateDefault,
  currentState,
  defaultFilterState,
  glitchState,
  previousState,
  sampleRateState,
  streamState,
} from "../state";

/**
 * 動的に追加されたストリームが、再起動後もコマンド・再生で使えるように
 * streamList と各 state の不足分だけを初期化する。
 *
 * Redis から復元済みの値（フィルター、サンプルレート、target など）は
 * 上書きしない。
 */
export const ensureStreamState = (streamName: string): void => {
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
  if (sampleRateState.randomrate[streamName] === undefined) {
    sampleRateState.randomrate[streamName] = false;
  }
  if (sampleRateState.randomraterange[streamName] === undefined) {
    sampleRateState.randomraterange[streamName] = {
      min: 4000,
      max: 132300,
    };
  }
  if (sampleRateState.randomratenote[streamName] === undefined) {
    sampleRateState.randomratenote[streamName] = false;
  }

  if (glitchState.glitch[streamName] === undefined) {
    glitchState.glitch[streamName] = false;
  }

  if (streamState.random[streamName] === undefined) {
    streamState.random[streamName] = true;
  }
  if (streamState.grid[streamName] === undefined) {
    streamState.grid[streamName] = false;
  }
  if (streamState.target[streamName] === undefined) {
    streamState.target[streamName] = [];
  }
  if (streamState.filter[streamName] === undefined) {
    streamState.filter[streamName] = { ...defaultFilterState };
  }
  if (streamState.pa[streamName] === undefined) {
    streamState.pa[streamName] = false;
  }
  if (streamState.loop[streamName] === undefined) {
    streamState.loop[streamName] = [];
  }

  for (const clientId in bpmState) {
    if (bpmState[clientId].stream[streamName] === undefined) {
      bpmState[clientId].stream[streamName] = {
        beat: bpmStateDefault.beat,
        gridFlag: bpmStateDefault.gridFlag,
        quantizeFlag: bpmStateDefault.quantizeFlag,
      };
    }
  }
};

/**
 * streams:keys に保存されているストリーム名を streamList へ復元する。
 * 起動時は loadAllStates() と sanitize の後に呼ぶこと。
 */
export const restoreStreamListFromKeys = (streamNames: string[]): void => {
  for (const streamName of streamNames) {
    ensureStreamState(streamName);
  }
};
