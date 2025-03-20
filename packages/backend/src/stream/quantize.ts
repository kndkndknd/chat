import SocketIO from "socket.io";

import { quantizeStateType } from "../../../types/global";
import { millisecondsPerBar } from "../cmd/bpmCalc";
import { quantizeObjType } from "../../../types/quantizeType";
import { clientState, quantizeState } from "../states";

export const quantizeCmd = (
  // io: SocketIO.Server,
  streamTarget: string,
  clientTarget: string,
  beat: number,
  bpm?: number,
  flag?: boolean
): quantizeObjType => {
  console.log("quantize state", quantizeState);
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
      quantizeState.bpm[streamTarget] !== undefined
    ) {
      quantizeObj.bpm = quantizeState.bpm[streamTarget][clientTarget];
    } else {
      quantizeObj.bpm = averageBPM(streamTarget, clientTarget, quantizeState);
    }
  }
  quantizeObj.bar = millisecondsPerBar(quantizeObj.bpm);
  if (flag !== undefined) {
    quantizeObj.flag = flag;
    if (clientTarget === "all") {
      for (let key in quantizeState.flag.client) {
        quantizeState.flag.client[key] = flag;
      }
    } else {
      quantizeState.flag.client[clientTarget] = flag;
    }
    if (streamTarget === "all") {
      for (let key in quantizeState.flag.stream) {
        quantizeState.flag.stream[key] = flag;
      }
    } else {
      quantizeState.flag.stream[streamTarget] = flag;
    }
  } else if (clientTarget !== "all") {
    if (quantizeState.flag.client[clientTarget] !== undefined) {
      quantizeObj.flag = !quantizeState.flag.client[clientTarget];
    } else {
      quantizeObj.flag = true;
    }
    quantizeState.flag.client[clientTarget] = quantizeObj.flag;
    if (streamTarget !== "all") {
      if (quantizeState.flag.stream[streamTarget] !== undefined) {
        quantizeObj.flag = !quantizeState.flag.stream[streamTarget];
      } else {
        quantizeObj.flag = true;
      }
      quantizeState.flag.stream[streamTarget] = quantizeObj.flag;
    } else {
      for (let key in quantizeState.flag.stream) {
        quantizeState.flag.stream[key] = quantizeObj.flag;
      }
    }
  } else if (streamTarget !== "all") {
    // clientTarget==='all'しかない
    if (quantizeState.flag.stream[streamTarget] !== undefined) {
      quantizeObj.flag = !quantizeState.flag.stream[streamTarget];
    } else {
      quantizeObj.flag = true;
    }
    for (let key in quantizeState.flag.client) {
      quantizeState.flag.client[key] = quantizeObj.flag;
    }
  } else if (
    Object.keys(quantizeState.flag.client).filter((element) => {
      return quantizeState.flag.client[element];
    }).length >
    Object.keys(clientState.client).length / 2
  ) {
    // どっちもallかつ過半数がtrue => すべてfalse
    console.log("test false");
    quantizeObj.flag = false;
    for (let key in quantizeState.flag.client) {
      quantizeState.flag.client[key] = quantizeObj.flag;
    }
    for (let key in quantizeState.flag.stream) {
      quantizeState.flag.stream[key] = quantizeObj.flag;
    }
  } else {
    console.log("test true");
    console.log(
      Object.keys(quantizeState.flag.client).filter((element) => {
        return quantizeState.flag.client[element] === true;
      })
    );
    console.log(quantizeState.flag.client);
    // どっちもallかつ過半数がfalse => すべてtrue
    quantizeObj.flag = true;
    for (let key in quantizeState.flag.client) {
      quantizeState.flag.client[key] = quantizeObj.flag;
    }
    for (let key in quantizeState.flag.stream) {
      quantizeState.flag.stream[key] = quantizeObj.flag;
    }
  }
  console.log("quantizeObj", quantizeObj);
  return quantizeObj;
};

const averageBPM = (
  streamTarget: string,
  clientTarget: string,
  quantizeState: quantizeStateType
) => {
  let bpm = 0;
  const stateBPM = quantizeState.bpm;
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
