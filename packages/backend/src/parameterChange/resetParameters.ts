import { gainStateType } from "../../../../types";
import { cmdState } from "../state/states/cmdState";
import { glitchState } from "../state/states/glitchState";
import { sampleRateState } from "../state/states/sampleRateState";
import { streamState, defaultFilterState } from "../state/states/streamState";
import { bpmState, bpmStateDefault } from "../state/states/bpmState";
import { ioState } from "../state/states/ioState";
import { parameterList } from "../data/list/parameterList";
import { stringEmit } from "../socket/ioEmit";

// 各 state 定義の初期値と一致させること
// (cmdState.ts / glitchState.ts / sampleRateState.ts / streamState.ts / bpmState.ts)。
const gainDefaults: gainStateType = {
  MASTER: 1.0,
  SINEWAVE: 0.2,
  FEEDBACK: 0.6,
  WHITENOISE: 0.5,
  CLICK: 0.4,
  BASS: 1.5,
  CHAT: 1.5,
  GLITCH: 2,
  SIMULATE: 1.0,
  METRONOME: 0.9,
};

const sampleRateDefault = 44100;
const clickFreqDefault = 440;

export const RESETTABLE_PARAMETERS = [
  "PORTAMENT",
  "SAMPLERATE",
  "GLITCH",
  "GRID",
  "QUANTIZE",
  "RANDOM",
  "VOICE",
  "FILTER",
  "GAIN",
  "FADE",
  "BPM",
  "CLICKFREQ",
] as const;

export type ResettableParameter = (typeof RESETTABLE_PARAMETERS)[number];

// PORT / RATE などの別名を parameterList 経由で正規名に寄せる。
export const normalizeParameterName = (name: string): string => {
  const upper = name.toUpperCase();
  return parameterList[upper] ?? upper;
};

export const isResettableParameter = (name: string): boolean =>
  RESETTABLE_PARAMETERS.includes(
    normalizeParameterName(name) as ResettableParameter
  );

const resetPortament = () => {
  cmdState.PORTAMENT = 0;
};

const resetSampleRate = () => {
  for (const stream of Object.keys(sampleRateState.sampleRate)) {
    sampleRateState.sampleRate[stream] = sampleRateDefault;
  }
};

const resetGlitch = () => {
  for (const stream of Object.keys(glitchState.glitch)) {
    glitchState.glitch[stream] = false;
  }
};

const resetGrid = () => {
  for (const client of Object.keys(bpmState)) {
    for (const stream of Object.keys(bpmState[client].stream)) {
      bpmState[client].stream[stream].gridFlag = bpmStateDefault.gridFlag;
    }
  }
};

const resetQuantize = () => {
  for (const client of Object.keys(bpmState)) {
    for (const stream of Object.keys(bpmState[client].stream)) {
      bpmState[client].stream[stream].quantizeFlag =
        bpmStateDefault.quantizeFlag;
    }
  }
};

const resetRandom = () => {
  for (const stream of Object.keys(streamState.random)) {
    streamState.random[stream] = false;
  }
};

const resetVoice = () => {
  cmdState.VOICE = [];
};

const resetFilter = () => {
  for (const stream of Object.keys(streamState.filter)) {
    Object.assign(streamState.filter[stream], defaultFilterState);
  }
};

const resetGain = () => {
  Object.assign(cmdState.GAIN, gainDefaults);
  ioState.io?.emit("gainFromServer", cmdState.GAIN);
};

const resetFade = () => {
  cmdState.FADE.IN = 0;
  cmdState.FADE.OUT = 0;
};

const resetBpm = () => {
  for (const client of Object.keys(bpmState)) {
    bpmState[client].bpm = bpmStateDefault.bpm;
    bpmState[client].METRONOME.beat = bpmStateDefault.beat;
    bpmState[client].MODULATION.beat = bpmStateDefault.beat;
    bpmState[client].TORCH.beat = bpmStateDefault.beat;
    for (const stream of Object.keys(bpmState[client].stream)) {
      bpmState[client].stream[stream].beat = bpmStateDefault.beat;
    }
  }
};

const resetClickFreq = () => {
  cmdState.CLICKFREQ = clickFreqDefault;
};

const resetParameter = (target: ResettableParameter) => {
  switch (target) {
    case "PORTAMENT":
      resetPortament();
      break;
    case "SAMPLERATE":
      resetSampleRate();
      break;
    case "GLITCH":
      resetGlitch();
      break;
    case "GRID":
      resetGrid();
      break;
    case "QUANTIZE":
      resetQuantize();
      break;
    case "RANDOM":
      resetRandom();
      break;
    case "VOICE":
      resetVoice();
      break;
    case "FILTER":
      resetFilter();
      break;
    case "GAIN":
      resetGain();
      break;
    case "FADE":
      resetFade();
      break;
    case "BPM":
      resetBpm();
      break;
    case "CLICKFREQ":
      resetClickFreq();
      break;
  }
};

// targets を省略（または空配列）で全パラメータを初期化する。
// 戻り値は実際に初期化したパラメータ名の配列。
export const resetParameters = (targets?: string[]): string[] => {
  const selected =
    targets && targets.length > 0
      ? targets.map(normalizeParameterName)
      : [...RESETTABLE_PARAMETERS];

  const done: string[] = [];
  for (const target of selected) {
    if (done.includes(target)) continue;
    resetParameter(target as ResettableParameter);
    done.push(target);
  }

  if (done.length > 0) {
    stringEmit(`RESET PARAMETERS: ${done.join(", ")}`, true);
  }
  return done;
};
