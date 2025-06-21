import SocketIO from "socket.io";

// import { putString } from './putString'
import {
  cmdState,
  streamState,
  glitchState,
  sampleRateState,
  clientState,
  currentState,
  bpmState,
} from "../state";
import { putCmd } from "../cmd/putCmd";
import { stringEmit } from "../socket/ioEmit";
import { notTargetEmit } from "../cmd/notTargetEmit";
import { millisecondsPerBar } from "../../../util/bpmCalc";
import { quantizeState } from "../state";
import { streamList } from "../data";

import { portamentChange } from "./portamentChange";
import { sampleRateChange } from "./sampleRateChange";
import { glitchChange } from "./glitchChange";
import { gridChange } from "./gridChange";
import { bpmChange } from "./bpmChange";
import { randomStreamOrder } from "./randomStreamOrder";
import { voiceChange } from "./voiceChange";

export const parameterChange = (
  param: string,
  io: SocketIO.Server,
  arg?: { source?: string; value?: number; property?: string }
) => {
  switch (param) {
    case "PORTAMENT":
      portamentChange(arg, io);
      break;
    case "SAMPLERATE":
      sampleRateChange(arg, io);
      break;
    case "GLITCH":
      glitchChange(arg, io);
      break;
    case "GRID":
      gridChange(arg, io);
      break;
    case "BPM":
      bpmChange(io, arg);
      break;
    case "RANDOM":
      randomStreamOrder(io);
      break;
    case "VOICE":
      voiceChange(io, arg);
      break;
  }
};
