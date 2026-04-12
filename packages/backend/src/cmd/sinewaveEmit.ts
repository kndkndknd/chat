import { putCmd } from "./cmdEmit";
// import { notTargetEmit } from "./notTargetEmit";
// import { pickupCmdTarget } from "./pickupCmdTarget";
import { pickupTarget } from "../clientProcess/pickupTarget";
import { currentState, previousState, clientState, cmdState } from "../state";
import { cmdSocketType } from "../../../../types";

export const sinewaveEmit = (
  frequencyStr: number,
  // state: cmdStateType,
  target?: string,
) => {
  // サイン波の処理

  let cmd: cmdSocketType = {
    type: "cmd",
    payload: {
      cmd: "SINEWAVE",
      option: {
        property: "",
        value: Number(frequencyStr),
        flag: true,
        fade: cmdState.FADE.IN,
        portament: cmdState.PORTAMENT,
        gain: cmdState.GAIN.SINEWAVE,
      },
    },
  };

  console.log("target;", target);
  if (target !== undefined) {
    previousState.sinewave[target] = currentState.sinewave[target];
  } else {
    previousState.sinewave = currentState.sinewave;
  }
  let targetIdArr =
    target !== undefined
      ? pickupTarget("SINEWAVE", "CMD", { value: frequencyStr, target })
      : pickupTarget("SINEWAVE", "CMD", { value: frequencyStr });
  console.log("targetArr", targetIdArr);
  console.log("client", clientState.client);
  console.log("cmdClient", clientState.cmdClient);

  targetIdArr.forEach((id) => {
    console.log("id", id);
    if (!Object.keys(currentState.sinewave).includes(id)) {
      cmd.payload.option.flag = true;
      cmd.payload.option.fade = cmdState.FADE.IN;
      currentState.sinewave[id] = cmd.payload.option.value;
    } else if (currentState.sinewave[id] !== cmd.payload.option.value) {
      cmd.payload.option.flag = true;
      cmd.payload.option.fade = 0;
      currentState.sinewave[id] = cmd.payload.option.value;
    } else {
      cmd.payload.option.flag = false;
      cmd.payload.option.fade = cmdState.FADE.OUT;
      delete currentState.sinewave[id];
    }
  });
  console.log(targetIdArr);

  console.log("current sinewave", currentState.sinewave);
  putCmd(targetIdArr, cmd.payload);
};
