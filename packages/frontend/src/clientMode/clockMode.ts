import { textPrint } from "../canvasEvent";
// import { cnvs, ctx } from "./globalVariable";

let clockModeId = null;

export const enableClockMode = (latency: number) => {
  clockModeId = window.setInterval(() => {
    const date = new Date();
    textPrint(String(date));
  }, latency);
  return clockModeId;
};

export const disableClockMode = (clockModeId) => {
  clearInterval(clockModeId);
  return 0;
};
