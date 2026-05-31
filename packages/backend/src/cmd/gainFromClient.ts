import { gainStateType } from "../../../../types";
import { cmdState } from "../state/states/cmdState";
import { IoFacade } from "../socket/IoFacade";

export const gainFromClient = (data: gainStateType, io: IoFacade): void => {
  for (const key in data) {
    if (cmdState.GAIN[key as keyof gainStateType] !== undefined) {
      cmdState.GAIN[key as keyof gainStateType] = data[key as keyof gainStateType];
    }
  }
  io.emit("gainFromServer", cmdState.GAIN);
};

// クライアントからの要求に応じて、現在のゲイン値(正本 cmdState.GAIN)を配信する。
// gainUI を開いたときにバックエンドの最新値を「表示」するために使用する。
// フロント側は gainFromServer を表示更新(setGainUI)のみに使い、実際の音量
// (GainNode)には適用しないため、UI を開いただけで音が出ることはない。
export const gainReqFromClient = (io: IoFacade): void => {
  io.emit("gainFromServer", cmdState.GAIN);
};
