import { putCmd } from "./putCmd";
// import { notTargetEmit } from "./notTargetEmit";
import { pickupCmdTarget } from "./pickupCmdTarget";
import { currentState, previousState, clientState, cmdState } from "../state";

export const sinewaveEmit = (
  frequencyStr: number,
  // state: cmdStateType,
  target?: string
) => {
  // サイン波の処理
  let cmd: {
    cmd: string;
    value: number;
    flag: boolean;
    fade: number;
    portament: number;
    gain: number;
  } = {
    cmd: "SINEWAVE",
    value: Number(frequencyStr),
    flag: true,
    fade: cmdState.FADE.IN,
    portament: cmdState.PORTAMENT,
    gain: cmdState.GAIN.SINEWAVE,
  };

  console.log("target;", target);
  if (target !== undefined) {
    previousState.sinewave[target] = currentState.sinewave[target];
  } else {
    previousState.sinewave = currentState.sinewave;
  }
  let targetIdArr =
    target !== undefined
      ? pickupCmdTarget("SINEWAVE", { value: frequencyStr, target })
      : pickupCmdTarget("SINEWAVE", { value: frequencyStr });
  console.log("targetArr", targetIdArr);
  console.log("client", clientState.client);
  console.log("cmdClient", clientState.cmdClient);

  targetIdArr.forEach((id) => {
    console.log("id", id);
    if (!Object.keys(currentState.sinewave).includes(id)) {
      cmd.flag = true;
      cmd.fade = cmdState.FADE.IN;
      currentState.sinewave[id] = cmd.value;
    } else if (currentState.sinewave[id] !== cmd.value) {
      cmd.flag = true;
      cmd.fade = 0;
      currentState.sinewave[id] = cmd.value;
    } else {
      cmd.flag = false;
      cmd.fade = cmdState.FADE.OUT;
      delete currentState.sinewave[id];
    }
  });
  console.log(targetIdArr);
  /*
  if (target) {
    targetId = target;
    if (Object.keys(currentState.sinewave).includes(targetId)) {
      // 送信先が同じ周波数で音を出している場合
      if (currentState.sinewave[targetId] === cmd.value) {
        cmd.flag = false;
        cmd.fade = cmdState.FADE.OUT;
        delete currentState.sinewave[targetId];
        // 送信先が違う周波数で音を出している場合
      } else {
        cmd.flag = true;
        cmd.fade = 0;
        currentState.sinewave[targetId] = cmd.value;
      }
    } else {
      // 送信先が音を出していない場合
      cmd.fade = cmdState.FADE.IN;
      currentState.sinewave[targetId] = cmd.value;
    }
  } else {
    // どの端末も音を出していない場合
    if (Object.keys(currentState.sinewave).length === 0) {
      cmd.fade = cmdState.FADE.IN;
      targetId = state.client[Math.floor(Math.random() * state.client.length)];
      console.log("debug: " + targetId);
      currentState.sinewave[targetId] = cmd.value;
      // state.previous.sinewave = {}
    } else {
      //同じ周波数の音を出している端末がある場合
      for (let id in currentState.sinewave) {
        if (cmd.value === currentState.sinewave[id]) {
          targetId = id;
          cmd.flag = false;
          cmd.fade = cmdState.FADE.OUT;
          delete currentState.sinewave[targetId];
        }
      }
      // 同じ周波数の音を出している端末がない場合
      if (targetId === "initial") {
        for (let i = 0; i < state.client.length; i++) {
          if (Object.keys(currentState.sinewave).includes(state.client[i])) {
            continue;
          } else {
            targetId = state.client[i];
          }
        }
        if (targetId === "initial") {
          targetId = Object.keys(currentState.sinewave)[
            Math.floor(
              Math.random() * Object.keys(currentState.sinewave).length
            )
          ];
        }
        currentState.sinewave[targetId] = cmd.value;
      }
    }
  }
  */
  console.log("current sinewave", currentState.sinewave);
  // console.log(targetIdArr);
  putCmd(targetIdArr, cmd);
  // putCmd(io, targetId, cmd, state);
  // if (target === undefined) {
  //   notTargetEmit(targetId, state.client, io);
  // }
};
