import SocketIO from "socket.io";

// import { putString } from './putString'
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
