import {
  cmdState,
  currentState,
  bpmState,
  clientState,
  bpmStateDefault,
} from "../state";
import { putCmd } from "../cmd/cmdEmit";
import { stringEmit } from "../socket/ioEmit";
import { millisecondsPerBar } from "../../../util/bpmCalc";
import { streamList } from "../data";
import { broadcastEmit, targetEmit } from "../webSocket";
import { paramsSocketType } from "../../../../types";

export const bpmChange = (arg?: {
  source?: string;
  value?: number;
  property?: string;
}) => {
  if (arg && arg.value) {
    const latency = (60 * 1000) / arg.value;
    const bar = millisecondsPerBar(arg.value);

    if (arg.property) {
      if (["CHAT", ...streamList].includes(arg.property)) {
        // propertyがSTREAMを指定している場合
        for (const client of Object.keys(bpmState)) {
          if (
            Object.keys(bpmState[client].stream).length === 0 ||
            bpmState[client].stream[arg.property] === undefined
          ) {
            bpmState[client].stream[arg.property] = {
              bpm: arg.value,
              beat: bpmStateDefault.beat,
              gridFlag: false,
              quantizeFlag: false,
              latency: latency,
            };
          } else {
            bpmState[client].stream[arg.property].bpm = arg.value;
            bpmState[client].stream[arg.property].latency = latency;
          }
        }
        // streamState.latency[arg.property] = latency;
        // cmdState.METRONOME = {};
        // io.emit("bpmFromServer", { bpm: arg.value, bar: bar });
        const data: paramsSocketType = {
          type: "params",
          payload: {
            type: "bpm",
            bpm: arg.value,
            bar: bar,
          },
        };
        broadcastEmit(data);

        // stringEmit(
        //   io,
        //   "BPM: " + String(arg.value) + "(" + arg.property + ")"
        //   // state
        // );
        // propertyが端末番号を指定している場合
      } else if (/^([1-9]\d*|0)(\.\d+)?$/.test(arg.property)) {
        const target = Object.keys(clientState.client)[Number(arg.property)];
        if (Object.keys(bpmState).includes(target)) {
          bpmState[target].METRONOME.bpm = arg.value;
          for (const stream in bpmState[target].stream) {
            bpmState[target].stream[stream] =
              bpmState[target].stream[stream] === undefined
                ? {
                    bpm: arg.value,
                    beat: 0,
                    gridFlag: false,
                    quantizeFlag: false,
                    latency: latency,
                  }
                : {
                    bpm: arg.value,
                    beat: bpmState[target].stream[stream].beat,
                    gridFlag: bpmState[target].stream[stream].gridFlag,
                    quantizeFlag: bpmState[target].stream[stream].quantizeFlag,
                    latency: latency,
                  };
          }
          const data: paramsSocketType = {
            type: "params",
            payload: {
              type: "bpm",
              bpm: arg.value,
              bar: bar,
            },
          };
          targetEmit(target, data);
          // io.to(target).emit("bpmFromServer", {
          //   bpm: arg.value,
          //   bar: bar,
          // });
          // stringEmit(
          //   io,
          //   "BPM: " + String(arg.value) + "(client " + arg.property + ")"
          //   // state
          // );
        }
        if (currentState.cmd.METRONOME.includes(target)) {
          const cmd: {
            cmd: string;
            property?: string;
            value?: number;
            flag?: boolean;
            fade?: number;
            gain?: number;
          } = {
            cmd: "METRONOME",
            flag: true,
            gain: cmdState.GAIN.METRONOME,
            value: latency,
          };
          putCmd([target], cmd);
          const data: paramsSocketType = {
            type: "params",
            payload: {
              type: "bpm",
              bpm: arg.value,
              bar: bar,
            },
          };
          targetEmit(target, data);
        }
      }
      // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value)  + '(' + arg.property + ')', timeout: true})
    } else {
      for (const client in bpmState) {
        if (bpmState[client].METRONOME === undefined) {
          bpmState[client].METRONOME = {
            bpm: arg.value,
            beat: bpmStateDefault.beat,
            flag: false,
          };
        } else {
          bpmState[client].METRONOME.bpm = arg.value;
        }
        if (bpmState[client].MODULATION === undefined) {
          bpmState[client].MODULATION = {
            bpm: arg.value,
            beat: bpmStateDefault.beat,
            flag: false,
          };
        } else {
          bpmState[client].METRONOME.bpm = arg.value;
        }

        for (let stream of ["CHAT", ...streamList]) {
          if (bpmState[client].stream[stream] === undefined) {
            bpmState[client].stream[stream] = {
              bpm: arg.value,
              beat: bpmStateDefault.beat,
              gridFlag: false,
              quantizeFlag: false,
              latency: latency,
            };
          } else {
            bpmState[client].stream[stream].bpm = arg.value;
            bpmState[client].stream[stream].latency = latency;
          }
        }
      }

      if (currentState.cmd.METRONOME.length > 0) {
        currentState.cmd.METRONOME.forEach((target) => {
          const cmd: {
            cmd: string;
            property?: string;
            value?: number;
            flag?: boolean;
            fade?: number;
            gain?: number;
          } = {
            cmd: "METRONOME",
            flag: true,
            gain: cmdState.GAIN.METRONOME,
            value: latency,
          };
          putCmd([target], cmd);
        });
      }
      // io.emit("bpmFromServer", { bpm: arg.value, bar: bar });
      const data: paramsSocketType = {
        type: "params",
        payload: {
          type: "bpm",
          bpm: arg.value,
          bar: bar,
        },
      };
      broadcastEmit(data);

      stringEmit("BPM: " + String(arg.value));
      // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value), timeout: true})
    }
  }
};
