import { flagState } from "../state";
import { muteReqEmit } from "../socket/ioEmit";

// MUTE / UNMUTE は全端末共通の操作。トグルではなく、常に指定した状態へ設定する。
export const setMute = (flag: boolean): void => {
  flagState.mute = flag;
  muteReqEmit(flag);
};

// MUTE / UNMUTE の引数を解釈する。不正な引数は undefined を返す。
export const parseMuteFlag = (
  cmd: string,
  arg?: string,
): boolean | undefined => {
  const value = arg?.trim().toUpperCase() || undefined;

  if (cmd === "MUTE") {
    if (
      value === undefined ||
      value === "ON" ||
      value === "TRUE" ||
      value === "1"
    ) {
      return true;
    }
    if (value === "OFF" || value === "FALSE" || value === "0") {
      return false;
    }
    return undefined;
  }

  if (cmd === "UNMUTE") {
    if (
      value === undefined ||
      value === "OFF" ||
      value === "FALSE" ||
      value === "0"
    ) {
      return false;
    }
    return undefined;
  }

  return undefined;
};
