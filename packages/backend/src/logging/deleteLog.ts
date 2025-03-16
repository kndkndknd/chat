import { cmdLog } from "../states";

export const deleteLog = () => {
  cmdLog.splice(0, cmdLog.length);
};
