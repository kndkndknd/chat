import {
  streamList,
  streamState,
  currentState,
  previousState,
  sampleRateState,
  glitchState,
  quantizeState,
  clientState,
} from "../states";

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
  streamState.grid[streamName] = true;
  streamState.latency[streamName] = 1000;
  streamState.random[streamName] = random !== undefined ? random : true;
  sampleRateState.randomrate[streamName] = false;
  streamState.target[streamName] = [];
  sampleRateState.randomratemode = "random";
  sampleRateState.randomraterange[streamName] = {
    min: 5000,
    max: 132300,
  };
  quantizeState.flag.stream[streamName] = false;
  quantizeState.bpm[streamName] = {};
  quantizeState.beat[streamName] = {};
  for (let key in clientState.client) {
    quantizeState.bpm[streamName][key] = 60;
    quantizeState.beat[streamName][key] = 0;
  }
};
