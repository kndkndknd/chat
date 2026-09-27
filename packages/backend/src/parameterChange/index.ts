// import { putString } from './putString'
import { portamentChange } from "./portamentChange";
import { sampleRateChange } from "./sampleRateChange";
import { glitchChange } from "./glitchChange";
// import { bpmChange } from "./bpmChange";
import { randomStreamOrder } from "./randomStreamOrder";
import { voiceChange } from "./voiceChange";
import { gridChange } from "../bpm/gridChange";

export const parameterChange = (
  param: string,
  arg?: { source?: string; value?: number; property?: string }
) => {
  switch (param) {
    case "PORTAMENT":
      portamentChange(arg);
      break;
    case "SAMPLERATE":
      sampleRateChange(arg);
      break;
    case "GLITCH":
      glitchChange(arg);
      break;
    case "GRID":
      gridChange(arg);
      break;
    case "RANDOM":
      randomStreamOrder();
      break;
    case "VOICE":
      voiceChange(arg);
      break;
  }
};
