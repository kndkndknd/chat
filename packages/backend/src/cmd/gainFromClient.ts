import { gainStateType } from "../../../../types";
import { cmdState } from "../state/states/cmdState";
import { IoFacade } from "../socket/IoFacade";
import { clampGain, isGainKey } from "./gainValue";

export const gainFromClient = (data: gainStateType, io: IoFacade): void => {
  for (const key of Object.keys(data)) {
    if (!isGainKey(key)) {
      continue;
    }
    const value = data[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    cmdState.GAIN[key] = clampGain(value);
  }
  io.emit("gainFromServer", cmdState.GAIN);
};

// クライアントからの要求に応じて、現在のゲイン値(正本 cmdState.GAIN)を配信する。
// 接続時・再接続時にもフロントから要求され、UI更新とグローバルゲイン適用に使われる。
export const gainReqFromClient = (io: IoFacade): void => {
  io.emit("gainFromServer", cmdState.GAIN);
};
