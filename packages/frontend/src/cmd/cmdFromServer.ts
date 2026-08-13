import {
  sinewave,
  whitenoise,
  feedback,
  bass,
  click,
  simulate,
  metronome,
} from "../webaudio";
import { textPrint, erasePrint } from "../canvasEvent";
import { flagState } from "../state";
import { stopCmd } from "./stopCmd";

export const cmdFromServer = (cmd: {
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
}) => {
  switch (cmd.cmd) {
    case "WHITENOISE":
      // erasePrint(stx, strCnvs);
      erasePrint();
      if (cmd.flag) {
        textPrint(cmd.cmd);
      } else {
        textPrint(`STOP ${cmd.cmd}`, { timeout: true, timeoutDuration: 500 });
      }
      whitenoise(cmd.flag, cmd.fade, cmd.gain);
      break;
    case "SINEWAVE":
      // erasePrint(stx, strCnvs);
      erasePrint();
      const cmdString = cmd.flag ? String(cmd.value) + "Hz" : "SINEWAVE";
      if (cmd.flag) {
        textPrint(cmdString);
      } else {
        textPrint(`STOP ${cmdString}`, { timeout: true, timeoutDuration: 500 });
      }
      sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain);
      break;
    case "FEEDBACK":
      erasePrint();
      if (cmd.flag) {
        textPrint(cmd.cmd);
      } else {
        textPrint(`STOP ${cmd.cmd}`, { timeout: true, timeoutDuration: 500 });
      }
      feedback(cmd.flag, cmd.fade, cmd.gain);
      break;
    case "BASS":
      bass(cmd.flag, cmd.gain);
      erasePrint();
      if (cmd.flag) {
        textPrint(cmd.cmd);
      } else {
        textPrint(`STOP ${cmd.cmd}`, { timeout: true, timeoutDuration: 500 });
      }
      break;
    case "CLICK":
      if(cmd.value === undefined || !cmd.value || cmd.value < 20 || cmd.value > 20000) {
        click(cmd.gain, 440);
      } else {
        click(cmd.gain, cmd.value);
      }
      erasePrint();
      textPrint("CLICK", { timeout: true, timeoutDuration: 300 });
      break;
    case "SIMULATE":
      simulate(cmd.gain);
      break;
    case "METRONOME":
      console.log("METRONOME");
      metronome(cmd.flag, cmd.value, cmd.gain);
      break;
    case "LATENCY":
      flagState.recLatency = !flagState.recLatency;
      textPrint(`LATENCY: ${flagState.recLatency}`, {
        timeout: true,
        timeoutDuration: 500,
      });
      break;
    default:
      break;
  }
  if (cmd.solo !== undefined && cmd.solo !== null && cmd.solo === true) {
    stopCmd(0, cmd.cmd);
  }
};
