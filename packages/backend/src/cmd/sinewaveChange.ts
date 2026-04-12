import { putCmd } from "./cmdEmit";
import { currentState, previousState, cmdState } from "../state";
import { CmdOptionType } from "../../../../types";

export const sinewaveChange = (
  cmdStrings: string,
  options?: {
    value?: number;
    id?: string;
  },
) => {
  if (options === undefined || options.id === undefined) {
    if (cmdStrings === "TWICE") {
      for (let id in currentState.sinewave) {
        previousState.sinewave[id] = currentState.sinewave[id];
        currentState.sinewave[id] = currentState.sinewave[id] * 2;
        const option: CmdOptionType = {
          value: currentState.sinewave[id],
          flag: true,
          fade: 0,
          portament: cmdState.PORTAMENT,
          gain: cmdState.GAIN.SINEWAVE,
        };
        putCmd([id], { cmd: "SINEWAVE", ...option });
        // io.to(id).emit('cmdFromServer', cmd)
      }
    } else if (cmdStrings === "HALF") {
      for (let id in currentState.sinewave) {
        previousState.sinewave[id] = currentState.sinewave[id];
        currentState.sinewave[id] = currentState.sinewave[id] / 2;
        const option: CmdOptionType = {
          value: currentState.sinewave[id],
          flag: true,
          fade: 0,
          portament: cmdState.PORTAMENT,
          gain: cmdState.GAIN.SINEWAVE,
        };
        //io.to(id).emit('cmdFromServer', cmd)
        putCmd([id], { cmd: "SINEWAVE", ...option });
      }
    }
  } else {
    const id = options.id;
    if (cmdStrings === "TWICE") {
      previousState.sinewave[id] = currentState.sinewave[id];
      currentState.sinewave[id] = currentState.sinewave[id] * 2;
      const option: CmdOptionType = {
        value: currentState.sinewave[id],
        flag: true,
        fade: 0,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      putCmd([id], { cmd: "SINEWAVE", ...option });
    } else if (cmdStrings === "HALF") {
      previousState.sinewave[id] = currentState.sinewave[id];
      currentState.sinewave[id] = currentState.sinewave[id] / 2;
      const option: CmdOptionType = {
        value: currentState.sinewave[id],
        flag: true,
        fade: 0,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      };
      //io.to(id).emit('cmdFromServer', cmd)
      putCmd([id], { cmd: "SINEWAVE", ...option });
    }
  }
};
