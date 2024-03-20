import {
  sinewave,
  whitenoise,
  feedback,
  bass,
  click,
  simulate,
  metronome,
  stopCmd,
} from "./webaudio";
import { textPrint, erasePrint } from "./imageEvent";

export const cmdFromServer = (
  cmd: {
    cmd: string;
    property: string;
    value: number;
    flag: boolean;
    target?: string;
    overlay?: boolean;
    fade?: number;
    portament?: number;
    gain?: number;
    solo?: boolean;
  },
  ctx,
  cnvs
) => {
  switch (cmd.cmd) {
    case "WHITENOISE":
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      if (cmd.flag) {
        textPrint(cmd.cmd, ctx, cnvs);
      } else {
        textPrint(`STOP ${cmd.cmd}`, ctx, cnvs);
        setTimeout(() => {
          erasePrint(ctx, cnvs);
        }, 500);
      }
      // if(cmd.fade && cmd.gain)
      whitenoise(cmd.flag, cmd.fade, cmd.gain);
      // if (cinemaFlag) {
      //   setTimeout(() => {
      //     erasePrint(ctx, cnvs);
      //   }, 500);
      // }
      break;
    case "SINEWAVE":
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      const cmdString = cmd.flag ? String(cmd.value) + "Hz" : "SINEWAVE";
      if (cmd.flag) {
        textPrint(cmdString, ctx, cnvs);
      } else {
        textPrint(`STOP ${cmdString}`, ctx, cnvs);
        setTimeout(() => {
          erasePrint(ctx, cnvs);
        }, 500);
      }
      // textPrint(cmdString, ctx, cnvs);
      // if(cmd.fade && cmd.portament && cmd.gain) {
      sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain);
      // if (cinemaFlag) {
      //   setTimeout(() => {
      //     erasePrint(ctx, cnvs);
      //   }, 500);
      // }
      break;
    case "FEEDBACK":
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      // textPrint("FEEDBACK", ctx, cnvs);
      if (cmd.flag) {
        textPrint(cmd.cmd, ctx, cnvs);
      } else {
        textPrint(`STOP ${cmd.cmd}`, ctx, cnvs);
        setTimeout(() => {
          erasePrint(ctx, cnvs);
        }, 500);
      }
      // if(cmd.fade && cmd.gain)
      feedback(cmd.flag, cmd.fade, cmd.gain);
      // if (cinemaFlag) {
      //   setTimeout(() => {
      //     erasePrint(ctx, cnvs);
      //   }, 500);
      // }
      break;
    case "BASS":
      // if(cmd.gain)
      bass(cmd.flag, cmd.gain);
      // erasePrint(stx, strCnvs);
      erasePrint(ctx, cnvs);
      if (cmd.flag) {
        textPrint(cmd.cmd, ctx, cnvs);
      } else {
        textPrint(`STOP ${cmd.cmd}`, ctx, cnvs);
        setTimeout(() => {
          erasePrint(ctx, cnvs);
        }, 500);
      }
      // if (cinemaFlag) {
      //   setTimeout(() => {
      //     erasePrint(ctx, cnvs);
      //   }, 500);
      // }
      break;
    case "CLICK":
      // if(cmd.gain)
      click(cmd.gain);
      // erasePrint(stx, strCnvs)
      erasePrint(ctx, cnvs);
      textPrint("CLICK", ctx, cnvs);
      setTimeout(() => {
        erasePrint(ctx, cnvs);
      }, 300);
      break;
    case "SIMULATE":
      simulate(cmd.gain);
      break;
    case "METRONOME":
      console.log("METRONOME");
      metronome(cmd.flag, cmd.value, cmd.gain);
      break;
    default:
      break;
  }
  if (cmd.solo !== undefined && cmd.solo !== null && cmd.solo === true) {
    stopCmd(0, cmd.cmd);
  }
};
