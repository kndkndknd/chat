import { cmdSocketType } from "../../../../types";
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
// import { hlsVideoPlay } from "../hlsVideo";
import { flagState } from "../state";
import { stopCmd } from "./stopCmd";
import { text } from "stream/consumers";
// import { frontState } from "./globalVariable";

export const cmdMessage = ({type, payload}: cmdSocketType) => {
  console.log(payload.cmd);
  if (payload.cmd === "BASS") {
    bass(payload.option.flag, payload.option.gain);
    cmdPrint(payload.cmd, payload.option.flag);
  } else if (payload.cmd === "CLICK") {
    click(payload.option.gain);
    erasePrint();
    textPrint("CLICK", { timeout: true, timeoutDuration: 300 });
  } else if (payload.cmd === "FEEDBACK") {
    cmdPrint(payload.cmd, payload.option.flag);
    feedback(payload.option.flag, payload.option.fade, payload.option.gain);
  } else if (payload.cmd === "SINEWAVE") {
    const cmdString = payload.option.flag ? String(payload.option.value) + "Hz" : "SINEWAVE";
    cmdPrint(cmdString, payload.option.flag);
    sinewave(payload.option.flag, payload.option.value, payload.option.fade, payload.option.portament,payload.option.gain);
  } else if (payload.cmd === "WHITENOISE") {
    cmdPrint(payload.cmd, payload.option.flag);
    whitenoise(payload.option.flag, payload.option.fade, payload.option.gain);
  }
  if(payload.option.solo !== undefined && payload.option.solo !== null && payload.option.solo){
    stopCmd(0, payload.cmd);
  }
};

const cmdPrint = (cmd: string, flag: boolean) => {
  erasePrint();
  if (flag) {
    textPrint(cmd);
  } else {
    textPrint(`STOP ${cmd}`, { timeout: true, timeoutDuration: 500 });
  }
}
