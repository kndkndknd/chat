import { putCmd } from "./putCmd";
import { currentState, previousState, cmdState } from "../state";

export const sinewaveChange = (
  cmdStrings: string,
  options?: {
    value?: number;
    id?: string;
  }
) => {
  if (options === undefined || options.id === undefined) {
    if (cmdStrings === "TWICE") {
      for (let id in currentState.sinewave) {
        previousState.sinewave[id] = currentState.sinewave[id];
        currentState.sinewave[id] = currentState.sinewave[id] * 2;
        const cmd: {
          cmd: string;
          value: number;
          flag: boolean;
          fade: number;
          portament: number;
          gain: number;
        } = {
          cmd: "SINEWAVE",
          value: currentState.sinewave[id],
          flag: true,
          fade: 0,
          portament: cmdState.PORTAMENT,
          gain: cmdState.GAIN.SINEWAVE,
        };
        putCmd([id], cmd);
      }
    } else if (cmdStrings === "HALF") {
      for (let id in currentState.sinewave) {
        previousState.sinewave[id] = currentState.sinewave[id];
        currentState.sinewave[id] = currentState.sinewave[id] / 2;
        const cmd: {
          cmd: string;
          value: number;
          flag: boolean;
          fade: number;
          portament: number;
          gain: number;
        } = {
          cmd: "SINEWAVE",
          value: currentState.sinewave[id],
          flag: true,
          fade: 0,
          portament: cmdState.PORTAMENT,
          gain: cmdState.GAIN.SINEWAVE,
        };
        putCmd([id], cmd);
      }
    }
  } else {
    const id = options.id;
    if (cmdStrings === "TWICE") {
      previousState.sinewave[id] = currentState.sinewave[id];
      currentState.sinewave[id] = currentState.sinewave[id] * 2;
      const cmd: {
        cmd: string;
        value: number;
        flag: boolean;
        fade: number;
        portament: number;
        gain: number;
      } = {
        cmd: "SINEWAVE",
        value: currentState.sinewave[id],
        flag: true,
        fade: 0,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd([id], cmd);
    } else if (cmdStrings === "HALF") {
      previousState.sinewave[id] = currentState.sinewave[id];
      currentState.sinewave[id] = currentState.sinewave[id] / 2;
      const cmd: {
        cmd: string;
        value: number;
        flag: boolean;
        fade: number;
        portament: number;
        gain: number;
      } = {
        cmd: "SINEWAVE",
        value: currentState.sinewave[id],
        flag: true,
        fade: 0,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd([id], cmd);
    }
  }
};
