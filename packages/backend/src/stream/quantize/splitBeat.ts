import { bpmState } from "../../state/states/bpmState";
import { ioState } from "../../state/states/ioState";
import { streamList } from "../../data";

export const splitBeat = (arg: number | "RANDOM", option?: {target?: string; stream?: string}) => {
  const beat: number = arg === "RANDOM" ? 0 : arg;
  if(option !== undefined && option.target !== undefined && option.target && bpmState[option.target] !== undefined) {
    for (const stream in bpmState[option.target].stream) {
      if(option.stream !== undefined && option.stream) {
        if(stream === option.stream) {
          bpmState[option.target].stream[stream].beat = beat;
        }
      } else {
        bpmState[option.target].stream[stream].beat = beat;
      }
      // bpmState[option.target].stream[stream].beat = beat;
    }
  } else {
    for (const client in bpmState) {
      for (const stream in bpmState[client].stream) {
        if(option !== undefined && option.stream !== undefined && option.stream) {
          if(stream === option.stream) {
            bpmState[client].stream[stream].beat = beat;
          }
        } else {
          bpmState[client].stream[stream].beat = beat;
        }
      }
    }
  }
  emitSplitBeat(option);
}

export const emitSplitBeat = (option?: {target?: string; stream?: string}) => {
  const targetArr: string[] = [];
  const streamArr: string[] = [];
  if(option !== undefined) {
    if(option.target !== undefined && option.target && bpmState[option.target] !== undefined) {
      targetArr.push(option.target);
    } else {
      for (const client in bpmState) {
        targetArr.push(client);
      }
    }
    if(option.stream !== undefined && option.stream && (streamList.includes(option.stream) || option.stream === "CHAT")) {
      streamArr.push(option.stream);
    } else {
      for (const stream in bpmState[targetArr[0]].stream) {
        streamArr.push(stream);
      }
    }
  } else {
    for (const client in bpmState) {
      targetArr.push(client);
    }
    for (const stream in bpmState[targetArr[0]].stream) {
      streamArr.push(stream);
    }
  }
  
  if(ioState?.io) {
    for (const target of targetArr) {
      console.log(`emitSplitBeat: target=${target}, stream=${streamArr}`, bpmState[target].stream);
        ioState.io.emit("quantizeFromServer2", {data:bpmState[target].stream, stream: streamArr});
    }
  }
}