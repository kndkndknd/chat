import { cmdLog } from "../data";

export const deleteLog = () => {
  cmdLog.splice(0, cmdLog.length);
};
