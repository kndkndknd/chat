import { streamState, clientState, currentState } from "../state";
import { cmdList } from "../data";
import { cmdSocketType, streamSocketType } from "../../../../types";

export const pickupTarget = (
  source: string,
  type: "CMD" | "STREAM",
  option?: {
    target?: string;
    value?: number;
    from?: string;
    pa?: boolean;
  }
): string[] => {
  if(type === "CMD") {
    const clientArr = option !== undefined && option.pa !== undefined && option.pa ? clientState.paCmdClient : clientState.cmdClient;
    const cmd = source === "SINEWAVE" ? "SINEWAVE" : (source as keyof typeof cmdList);

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
          // break;
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
          // break;      }
        case "SINEWAVE":
          if (option !== undefined && option.value !== undefined) {
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
          }
        default:
          return ["undefined"];
      }
    }
  } else {
    if(streamState.target[source] !== undefined && streamState.target[source].length > 1) {
      let targetArr = source === "CHAT" ? streamState.target[source].filter((id) => {
        return id !== option.from;
      }) : streamState.target[source];
      if (targetArr.length > 0) {
        const targetId = targetArr[Math.floor(Math.random() * targetArr.length)];
        return [targetId]
      } else {
        if(option !== undefined && option.from !== undefined) {
          return [option.from];
        } else {
          return ["undefined"];
        }
      }
    } else if (streamState.target[source] !== undefined && streamState.target[source].length === 1) {
      return streamState.target[source]
    } else {
      // targetがなければランダムに返す
      const targetArr = clientState.streamClient;
      return targetArr.length > 0 ? [targetArr[Math.floor(Math.random() * targetArr.length)]] : ["undefined"]
    }
  }
}
