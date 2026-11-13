import { clientState, currentState } from "../state";
import { cmdList } from "../data";

interface Cmd {
  cmd: string;
  property?: string;
  value?: number;
  flag?: boolean;
  fade?: number;
  gain?: number;
}

const isActiveClient = (id: string): boolean =>
  clientState.client[id] !== undefined;

const pickRandom = (arr: string[]): string =>
  arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";

export const commonPickupCmdTarget = (
  cmdString: string,
  clientArr: string[],
  option?: {
    target?: string;
    value?: number;
  }
): string[] => {
  const cmd =
    cmdString === "SINEWAVE" ? "SINEWAVE" : (cmdString as keyof typeof cmdList);
  const activeClients = clientArr.filter(isActiveClient);

  if (
    option !== undefined &&
    option.target !== undefined &&
    option.target &&
    isActiveClient(option.target)
  ) {
    return [option.target];
  }

  switch (cmd) {
    case "CLICK": {
      const target = pickRandom(activeClients);
      return target ? [target] : [];
    }
    case "BASS":
    case "WHITENOISE":
    case "FEEDBACK": {
      const currentTargets = (currentState.cmd[cmd] ?? []).filter(
        isActiveClient,
      );
      if (currentTargets.length === 0) {
        const target = pickRandom(activeClients);
        return target ? [target] : [];
      }
      return currentTargets;
    }
    case "SIMULATE":
      console.log("SIMULATE:", activeClients);
      return activeClients;
    case "SINEWAVE": {
      const activeSinewave = Object.keys(currentState.sinewave).filter(
        isActiveClient,
      );
      if (activeSinewave.length === 0) {
        //どの端末も音を出していない場合
        const target = pickRandom(activeClients);
        return target ? [target] : [];
      }
      if (option?.value === undefined) {
        return ["target is undefined"];
      }

      // 同じ周波数の音を出している端末がある場合
      const sameFreqArr: string[] = [];
      for (const id of activeSinewave) {
        if (option.value === currentState.sinewave[id]) {
          sameFreqArr.push(id);
          delete currentState.sinewave[id];
        }
      }
      if (sameFreqArr.length > 0) {
        return sameFreqArr;
      }

      // 音が出ていない端末があれば、その中からランダムに発音する。
      const remaining = Object.keys(currentState.sinewave).filter(
        isActiveClient,
      );
      const unsoundArr = activeClients.filter(
        (client) => !remaining.includes(client),
      );
      if (unsoundArr.length > 0) {
        return [pickRandom(unsoundArr)];
      }
      const target = pickRandom(activeClients);
      return target ? [target] : [];
    }
    default: {
      const target = pickRandom(
        Object.keys(clientState.client).filter((id) =>
          activeClients.includes(id),
        ),
      );
      return target ? [target] : [];
    }
  }
};

export const pickupCmdTarget = (
  cmdString: string,
  option?: {
    target?: string;
    value?: number;
  }
): string[] => {
  return commonPickupCmdTarget(cmdString, clientState.cmdClient, option)
};

export const pickupPaCmdTarget = (
  cmdString: string,
  option?: {
    target?: string;
    value?: number;
  }
): string[] => {
  return commonPickupCmdTarget(cmdString, clientState.paCmdClient, option)
};




/*
export const pickupCmdTarget = (state, cmdString: string, target?) => {
  const cmdKey = cmdString as keyof typeof cmdList;
  const cmd: Cmd = {
    cmd: cmdList[cmdKey],
  };
  state.previous.cmd[cmdKey] = state.current.cmd[cmdKey];
  if (target) {
    console.log(target);
    if (state.current.cmd[cmdKey].includes(target)) {
      cmd.flag = false;
      cmd.fade = state.cmd.FADE.OUT;
      for (let id in state.current.cmd[cmdKey]) {
        if (target === state.current.cmd[cmdKey][id]) {
          delete state.current.cmd[cmdKey][id];
        }
      }
      console.log(state.current.cmd[cmdKey]);
    } else {
      cmd.flag = true;
      cmd.fade = state.cmd.FADE.IN;
      state.current.cmd[cmdKey].push(target);
    }
    cmd.gain = state.cmd.GAIN[cmdKey];
    return { cmd: cmd, target: target };
  } else {
    if (state.current.cmd[cmd.cmd].length === 0) {
      cmd.flag = true;
      cmd.fade = state.cmd.FADE.IN;
      cmd.gain = state.cmd.GAIN[cmd.cmd];
      const targetId =
        state.client[Math.floor(Math.random() * state.client.length)];
      state.current.cmd[cmd.cmd].push(targetId);
      return { cmd: cmd, target: targetId };
    } else {
      cmd.flag = false;
      cmd.fade = state.cmd.FADE.OUT;
      cmd.gain = state.cmd.GAIN[cmd.cmd];
      const targetId = state.current.cmd[cmd.cmd].shift();
      return { cmd: cmd, target: targetId };
    }
  }
};
*/
