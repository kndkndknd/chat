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

const commonPickupCmdTarget = (
  cmdString: string,
  clientArr: string[],
  option?: {
    target?: string;
    value?: number;
  }
): string[] => {
  const cmd =
    cmdString === "SINEWAVE" ? "SINEWAVE" : (cmdString as keyof typeof cmdList);

  if (option !== undefined && option.target !== undefined && option.target) {
    return [option.target];
  } else {
    switch (cmd) {
      case "CLICK":
        return [
          clientArr[
            Math.floor(Math.random() * clientState.cmdClient.length)
          ],
        ];
        break;
      case "BASS":
      case "WHITENOISE":
      case "FEEDBACK":
        if (currentState.cmd[cmd].length === 0) {
          return [
            clientArr[
              Math.floor(Math.random() * clientState.cmdClient.length)
            ],
          ];
        } else {
          return currentState.cmd[cmd];
        }
        break;
      case "SINEWAVE":
        if (Object.keys(currentState.sinewave).length === 0) {
          //どの端末も音を出していない場合
          return [
            clientArr[
              Math.floor(Math.random() * clientState.cmdClient.length)
            ],
          ];
        } else {
          if (option.value !== undefined) {
            // 同じ周波数の音を出している端末がある場合 （同じ音を出している全部が対象になるべきでは？）
            let sameFreqArr: string[] = [];
            for (let id in currentState.sinewave) {
              if (option.value === currentState.sinewave[id]) {
                sameFreqArr.push(id);
                delete currentState.sinewave[id];
              }
            }
            if (sameFreqArr.length > 0) {
              return sameFreqArr;
            }

            // 同じ周波数の音を出している端末がない場合（上記でreturnされなかった場合）
            // 音が出ていない端末があれば、その中からランダムに発音、全部音が出てたら完全にランダム
            const unsoundArr = clientArr.filter(
              (client) => !Object.keys(currentState.sinewave).includes(client)
            );
            return unsoundArr.length > 0
              ? [unsoundArr[Math.floor(Math.random() * unsoundArr.length)]]
              : [
                  clientArr[
                    Math.floor(Math.random() * clientState.cmdClient.length)
                  ],
                ];
          } else {
            return ["target is undefined"];
          }
        }
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
