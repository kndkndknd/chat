import {
  streamState,
  currentState,
  previousState,
  sampleRateState,
  glitchState,
  clientState,
  bpmState,
} from "../state";
import { streamList } from "../data";

export const pushStateStream = (
  streamName: string,
  // states: cmdStateType,
  random?: boolean
) => {
  streamList.push(streamName);
  currentState.stream[streamName] = false;
  previousState.stream[streamName] = false;
  sampleRateState.sampleRate[streamName] = 44100;
  glitchState.glitch[streamName] = false;
  // streamState.grid[streamName] = true;
  // streamState.latency[streamName] = 1000;
  streamState.random[streamName] = random !== undefined ? random : true;
  sampleRateState.randomrate[streamName] = false;
  streamState.target[streamName] = [];
  sampleRateState.randomratemode = "random";
  sampleRateState.randomraterange[streamName] = {
    min: 5000,
    max: 132300,
  };
  // bpmState.stream[streamName] = {};
  for (const client in bpmState) {
    bpmState[client].stream[streamName] = {
      bpm: 60,
      beat: 0,
      gridFlag: true,
      quantizeFlag: false,
      latency: 0,
    };
  }
};
