import { streamList } from "../states.js";
import { cmdStateType } from "../types/global.js";

export const pushStateStream = (streamName: string, states: cmdStateType) => {
  streamList.push(streamName);
  states.current.stream[streamName] = false;
  states.previous.stream[streamName] = false;
  states.stream.sampleRate[streamName] = 44100;
  states.stream.glitch[streamName] = false;
  states.stream.grid[streamName] = false;
  states.stream.latency[streamName] = 1000;
  states.stream.random[streamName] = false;
  states.stream.randomrate[streamName] = false;
  states.stream.target[streamName] = [];
};
