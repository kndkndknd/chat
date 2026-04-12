import { putCmd } from "./cmdEmit";
import { notTargetEmit } from "./notTargetEmit";
import { millisecondsPerBeat } from "../../../util/bpmCalc";
import { currentState, cmdState, bpmState, clientState } from "../state";
import { streamList } from "../data";
// import { pickupCmdTarget } from "./pickupCmdTarget";
import { pickupTarget } from "../clientProcess/pickupTarget";

export const metronomeEmit = (cmd, target?) => {
  cmd = {
    cmd: "METRONOME",
  };

  if (target) {
    if (bpmState[target] === undefined) {
      bpmState[target] = {
        stream: {},
        METRONOME: { bpm: 60, beat: 4, flag: false },
        MODULATION: { bpm: 60, beat: 4, flag: false },
        TORCH: { bpm: 60, type: "STEADY", flag: false },
      };
      for (const stream of streamList) {
        bpmState[target].stream[stream] = {
          bpm: 60,
          beat: 0,
          gridFlag: false,
          quantizeFlag: false,
          latency: 1000,
        };
      }
    }
    if (currentState.cmd[cmd.cmd].includes(target)) {
      cmd.flag = false;
      cmd.gain = cmdState.GAIN.METRONOME;
      for (let id in currentState.cmd.METRONOME) {
        if (target === currentState.cmd.METRONOME[id]) {
          cmd.value = cmdState.METRONOME[target];
          delete currentState.cmd[cmd.cmd][id];
        }
      }
      console.log(currentState.cmd.METRONOME);
    } else {
      cmd.flag = true;
      cmd.gain = cmdState.GAIN.METRONOME;
      currentState.cmd.METRONOME.push(target);
      // cmd.value = cmdState.METRONOME[target];
      cmd.value = millisecondsPerBeat(bpmState[target].METRONOME.bpm);
    }
  } else {
    if (currentState.cmd.METRONOME.length === 0) {
      cmd.flag = true;
      cmd.gain = cmdState.GAIN.METRONOME;
      const targetIdArr = target
        ? pickupTarget("METRONOME", "CMD", { target: target })
        : pickupTarget("METRONOME", "CMD");
      target = targetIdArr[0];
      // target = Object.keys(clientState.client)[
      //   Math.floor(Math.random() * Object.keys(clientState.client).length)
      // ];
      currentState.cmd[cmd.cmd].push(target);
      cmd.value = millisecondsPerBeat(bpmState[target].METRONOME.bpm);
      // cmd.value = cmdState.METRONOME[target];
    } else {
      cmd.flag = false;
      cmd.gain = cmdState.GAIN.METRONOME;
      target = currentState.cmd.METRONOME.shift();
      // cmd.value = cmdState.METRONOME[target];
      cmd.value = millisecondsPerBeat(bpmState[target].METRONOME.bpm);
    }
  }
  putCmd([target], cmd);
  notTargetEmit(target, Object.keys(clientState.client));
  console.log("metronome");
};
