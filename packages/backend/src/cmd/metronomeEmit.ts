import { cmdEmit } from "../socket/ioEmit";
import { notTargetEmit } from "./notTargetEmit";
import { millisecondsPerBeat } from "../util/bpmCalc";
import { currentState, cmdState, bpmState, clientState } from "../state";
import { streamList } from "../data";
import { pickupCmdTarget } from "./pickupCmdTarget";

export const metronomeEmit = (cmd?, target?) => {
  cmd = {
    cmd: "METRONOME",
  };

  if (target) {
    if (bpmState[target] === undefined) {
      bpmState[target] = {
        bpm: 60,
        stream: {},
        METRONOME: { beat: 4, flag: false },
        MODULATION: { beat: 4, flag: false },
        TORCH: { type: "STEADY", flag: false, beat: 4 },
      };
      for (const stream of streamList) {
        bpmState[target].stream[stream] = {
          beat: 0,
          gridFlag: false,
          quantizeFlag: false,
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
      cmd.value = millisecondsPerBeat(bpmState[target].bpm);
    }
  } else {
    if (currentState.cmd.METRONOME.length === 0) {
      cmd.flag = true;
      cmd.gain = cmdState.GAIN.METRONOME;
      const targetIdArr = target
        ? pickupCmdTarget("METRONOME", { target: target })
        : pickupCmdTarget("METRONOME");
      target = (targetIdArr !== undefined && targetIdArr.length > 0) ? targetIdArr[0] : Object.keys(clientState.client)[Math.floor(Math.random() * Object.keys(clientState.client).length)];
      // target = Object.keys(clientState.client)[
      //   Math.floor(Math.random() * Object.keys(clientState.client).length)
      // ];
      currentState.cmd[cmd.cmd].push(target);
      cmd.value = millisecondsPerBeat(bpmState[target].bpm);
      // cmd.value = cmdState.METRONOME[target];
    } else {
      cmd.flag = false;
      cmd.gain = cmdState.GAIN.METRONOME;
      target = currentState.cmd.METRONOME.shift();
      // cmd.value = cmdState.METRONOME[target];
      cmd.value = millisecondsPerBeat(bpmState[target].bpm);
    }
  }
  cmdEmit([target], cmd);
  notTargetEmit(target, Object.keys(clientState.client));
  console.log("metronome");
};
