// import { Socket } from "socket.io-client";
import { textPrint } from "./imageEvent";
import { cnvs, ctx } from "./globalVariable";

let clockModeId = null;

export const enableClockMode = (latency: number) => {
  clockModeId = window.setInterval(() => {
    const date = new Date();
    // 暫定
    textPrint(String(date), ctx, cnvs);
  }, latency);
  return clockModeId;
};

export const disableClockMode = (clockModeId) => {
  clearInterval(clockModeId);
  return 0;
};
