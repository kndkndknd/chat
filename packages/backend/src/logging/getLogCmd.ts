import { cmdLog } from "../data";
let cmdLogNum = 0;

export const getLogCmd = (arrow: string) => {
  // export const getLogCmd = (cmdLogNum: number) => {
  if (arrow === "ArrowUp" && cmdLogNum < cmdLog.length) {
    cmdLogNum++;
  } else if (arrow === "ArrowDown" && cmdLogNum > 0) {
    cmdLogNum--;
  }

  if (cmdLog.length > 0 && cmdLogNum > 0) {
    console.log("cmdLog.length", cmdLog.length);
    console.log("cmdLogNum", cmdLogNum);

    console.log("cmdLogNum % cmdLog.length", cmdLogNum % cmdLog.length);
    const arrNum =
      cmdLog.length >= cmdLogNum
        ? cmdLog.length - cmdLogNum
        : cmdLog.length - (cmdLogNum % cmdLog.length) - 1;
    console.log("arrNum", arrNum);
    return cmdLog[arrNum].cmd;
  } else {
    return "";
  }
};

export const resetCmdLogNum = () => {
  cmdLogNum = 0;
};
