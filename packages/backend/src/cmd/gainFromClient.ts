import { gainStateType } from "../../../../types";
import { cmdState } from "../state/states/cmdState";
import { IoFacade } from "../socket/IoFacade";

export const gainFromClient = (data: gainStateType, io: IoFacade): void => {
  for (const key in data) {
    if (cmdState.GAIN[key as keyof gainStateType] !== undefined) {
      cmdState.GAIN[key as keyof gainStateType] = data[key as keyof gainStateType];
    }
  }
  io.emit("gainFromServer", data);
};
