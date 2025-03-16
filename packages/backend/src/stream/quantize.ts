import SocketIO from "socket.io";

import { cmdStateType } from "../../../types/global";
import { millisecondsPerBar } from "../cmd/bpmCalc";

export const quantizeCmd = (
  io: SocketIO.Server,
  state: cmdStateType,
  streamTarget: string,
  clientTarget: string,
  beat: number,
  bpm?: number,
  flag?: boolean
) => {
  console.log("quantize state", state.stream.quantize);
  const quantizeObj = {
    flag: true,
    stream: streamTarget,
    bpm: 60,
    bar: 4000,
    beat: beat,
  };
  if (bpm !== undefined) {
    quantizeObj.bpm = bpm;
  } else {
    // quantizeObj.bpm = state.current.cmd.METRONOME
    if (
      streamTarget !== "all" &&
      clientTarget !== "all" &&
      state.stream.quantize.bpm[streamTarget] !== undefined
    ) {
      quantizeObj.bpm = state.stream.quantize.bpm[streamTarget][clientTarget];
    } else {
      quantizeObj.bpm = averageBPM(streamTarget, clientTarget, state);
    }
  }
  quantizeObj.bar = millisecondsPerBar(quantizeObj.bpm);
  console.log(
    "quantizedClient",
    Object.keys(state.stream.quantize.flag.client).filter((element) => {
      return state.stream.quantize.flag.client[element];
    })
  );
  if (flag !== undefined) {
    quantizeObj.flag = flag;
    if (clientTarget === "all") {
      for (let key in state.stream.quantize.flag.client) {
        state.stream.quantize.flag.client[key] = flag;
      }
    } else {
      state.stream.quantize.flag.client[clientTarget] = flag;
    }
    if (streamTarget === "all") {
      for (let key in state.stream.quantize.flag.stream) {
        state.stream.quantize.flag.stream[key] = flag;
      }
    } else {
      state.stream.quantize.flag.stream[streamTarget] = flag;
    }
  } else if (clientTarget !== "all") {
    if (state.stream.quantize.flag.client[clientTarget] !== undefined) {
      quantizeObj.flag = !state.stream.quantize.flag.client[clientTarget];
    } else {
      quantizeObj.flag = true;
    }
    state.stream.quantize.flag.client[clientTarget] = quantizeObj.flag;
    if (streamTarget !== "all") {
      if (state.stream.quantize.flag.stream[streamTarget] !== undefined) {
        quantizeObj.flag = !state.stream.quantize.flag.stream[streamTarget];
      } else {
        quantizeObj.flag = true;
      }
      state.stream.quantize.flag.stream[streamTarget] = quantizeObj.flag;
    } else {
      for (let key in state.stream.quantize.flag.stream) {
        state.stream.quantize.flag.stream[key] = quantizeObj.flag;
      }
    }
  } else if (streamTarget !== "all") {
    // clientTarget==='all'しかない
    if (state.stream.quantize.flag.stream[streamTarget] !== undefined) {
      quantizeObj.flag = !state.stream.quantize.flag.stream[streamTarget];
    } else {
      quantizeObj.flag = true;
    }
    for (let key in state.stream.quantize.flag.client) {
      state.stream.quantize.flag.client[key] = quantizeObj.flag;
    }
  } else if (
    Object.keys(state.stream.quantize.flag.client).filter((element) => {
      return state.stream.quantize.flag.client[element];
    }).length >
    Object.keys(state.client).length / 2
  ) {
    // どっちもallかつ過半数がtrue => すべてfalse
    console.log("test false");
    quantizeObj.flag = false;
    for (let key in state.stream.quantize.flag.client) {
      state.stream.quantize.flag.client[key] = quantizeObj.flag;
    }
    for (let key in state.stream.quantize.flag.stream) {
      state.stream.quantize.flag.stream[key] = quantizeObj.flag;
    }
  } else {
    console.log("test true");
    console.log(
      Object.keys(state.stream.quantize.flag.client).filter((element) => {
        return state.stream.quantize.flag.client[element] === true;
      })
    );
    console.log(state.stream.quantize.flag.client);
    // どっちもallかつ過半数がfalse => すべてtrue
    quantizeObj.flag = true;
    for (let key in state.stream.quantize.flag.client) {
      state.stream.quantize.flag.client[key] = quantizeObj.flag;
    }
    for (let key in state.stream.quantize.flag.stream) {
      state.stream.quantize.flag.stream[key] = quantizeObj.flag;
    }
  }
  console.log("quantizeObj", quantizeObj);
  return quantizeObj;
};

const averageBPM = (
  streamTarget: string,
  clientTarget: string,
  state: cmdStateType
) => {
  let bpm = 0;
  const stateBPM = state.stream.quantize.bpm;
  console.log("stateBPM", stateBPM);
  if (streamTarget !== "all") {
    if (clientTarget !== "all") {
      return stateBPM[streamTarget][clientTarget];
    } else {
      //  stateBPM[streamTarget]内のすべてのオブジェクトの値の平均

      Object.keys(stateBPM[streamTarget]).forEach((element) => {
        bpm += stateBPM[streamTarget][element];
      });
      console.log("debug bpm: ", bpm);
      bpm = bpm / Object.keys(stateBPM[streamTarget]).length;
      console.log("client all bpm: ", bpm);
    }
  } else {
    if (clientTarget !== "all") {
      Object.keys(stateBPM).forEach((element) => {
        bpm += stateBPM[element][clientTarget];
      });
      bpm = bpm / Object.keys(stateBPM).length;
      // console.log("debug bpm: ", bpm);
    } else {
      let denominator = 0;
      Object.keys(stateBPM).forEach((streamElement) => {
        Object.keys(stateBPM[streamElement]).forEach((clientElement) => {
          bpm += stateBPM[streamElement][clientElement];
        });
        denominator += Object.keys(stateBPM[streamElement]).length;
      });
      bpm = bpm / denominator;
    }
  }
  return bpm;
};
