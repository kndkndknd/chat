import { sinewave, whitenoise, feedback, bass, click, simulate, metronome, } from "../webaudio";
import { textPrint, erasePrint } from "../canvasEvent";
import { hlsVideoPlay } from "../hlsVideo";
import { flagState } from "../state";
import { stopCmd } from "./stopCmd";
// import { frontState } from "./globalVariable";
export const cmdFromServer = (cmd) => {
    switch (cmd.cmd) {
        case "WHITENOISE":
            // erasePrint(stx, strCnvs);
            erasePrint();
            if (cmd.flag) {
                textPrint(cmd.cmd);
            }
            else {
                textPrint(`STOP ${cmd.cmd}`);
                setTimeout(() => {
                    erasePrint();
                }, 500);
            }
            // if(cmd.fade && cmd.gain)
            whitenoise(cmd.flag, cmd.fade, cmd.gain);
            // if (cinemaFlag) {
            //   setTimeout(() => {
            //     erasePrint();
            //   }, 500);
            // }
            break;
        case "SINEWAVE":
            // erasePrint(stx, strCnvs);
            erasePrint();
            const cmdString = cmd.flag ? String(cmd.value) + "Hz" : "SINEWAVE";
            if (cmd.flag) {
                textPrint(cmdString);
            }
            else {
                textPrint(`STOP ${cmdString}`);
                setTimeout(() => {
                    erasePrint();
                }, 500);
            }
            // textPrint(cmdString);
            // if(cmd.fade && cmd.portament && cmd.gain) {
            sinewave(cmd.flag, cmd.value, cmd.fade, cmd.portament, cmd.gain);
            // if (cinemaFlag) {
            //   setTimeout(() => {
            //     erasePrint();
            //   }, 500);
            // }
            break;
        case "FEEDBACK":
            // erasePrint(stx, strCnvs);
            erasePrint();
            // textPrint("FEEDBACK");
            if (cmd.flag) {
                textPrint(cmd.cmd);
            }
            else {
                textPrint(`STOP ${cmd.cmd}`);
                setTimeout(() => {
                    erasePrint();
                }, 500);
            }
            // if(cmd.fade && cmd.gain)
            feedback(cmd.flag, cmd.fade, cmd.gain);
            // if (cinemaFlag) {
            //   setTimeout(() => {
            //     erasePrint();
            //   }, 500);
            // }
            break;
        case "BASS":
            // if(cmd.gain)
            bass(cmd.flag, cmd.gain);
            // erasePrint(stx, strCnvs);
            erasePrint();
            if (cmd.flag) {
                textPrint(cmd.cmd);
            }
            else {
                textPrint(`STOP ${cmd.cmd}`);
                setTimeout(() => {
                    erasePrint();
                }, 500);
            }
            // if (cinemaFlag) {
            //   setTimeout(() => {
            //     erasePrint();
            //   }, 500);
            // }
            break;
        case "CLICK":
            // if(cmd.gain)
            click(cmd.gain);
            // erasePrint(stx, strCnvs)
            erasePrint();
            textPrint("CLICK");
            setTimeout(() => {
                erasePrint();
            }, 300);
            break;
        case "SIMULATE":
            simulate(cmd.gain);
            break;
        case "METRONOME":
            console.log("METRONOME");
            metronome(cmd.flag, cmd.value, cmd.gain);
            break;
        case "HLS":
            console.log("HLS");
            erasePrint();
            hlsVideoPlay(cmd.property);
            break;
        case "LATENCY":
            flagState.recLatency = !flagState.recLatency;
            textPrint(`LATENCY: ${flagState.recLatency}`);
            setTimeout(() => {
                erasePrint();
            }, 500);
            break;
        default:
            break;
    }
    if (cmd.solo !== undefined && cmd.solo !== null && cmd.solo === true) {
        stopCmd(0, cmd.cmd);
    }
};
