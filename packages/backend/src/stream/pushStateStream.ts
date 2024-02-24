import { streamList } from "../states";
import { cmdStateType } from "../types/global";

export const pushStateStream = (
  streamName: string,
  states: cmdStateType,
  random?: boolean
) => {
  streamList.push(streamName);
  states.current.stream[streamName] = false;
  states.previous.stream[streamName] = false;
  states.stream.sampleRate[streamName] = 44100;
  states.stream.glitch[streamName] = false;
  states.stream.grid[streamName] = false;
  states.stream.latency[streamName] = 1000;
  states.stream.random[streamName] = random !== undefined ? random : false;
  states.stream.randomrate[streamName] = false;
  states.stream.target[streamName] = [];
};
