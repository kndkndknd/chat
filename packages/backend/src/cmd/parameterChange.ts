import SocketIO from "socket.io";

// import { putString } from './putString'
import {
  cmdState,
  streamState,
  glitchState,
  sampleRateState,
  clientState,
  currentState,
  bpmState,
} from "../state";
import { putCmd } from "./putCmd";
import { stringEmit } from "../socket/ioEmit";
import { notTargetEmit } from "./notTargetEmit";
import { millisecondsPerBar } from "./bpmCalc";
import { quantizeState } from "../state";

export const parameterChange = (
  param: string,
  io: SocketIO.Server,
  arg?: { source?: string; value?: number; property?: string }
) => {
  switch (param) {
    case "PORTAMENT":
      if (arg && arg.value && isFinite(Number(arg.value))) {
        cmdState.PORTAMENT = arg.value;
      } else {
        if (cmdState.PORTAMENT > 0) {
          cmdState.PORTAMENT = 0;
        } else {
          cmdState.PORTAMENT = 5;
        }
      }
      // io.emit('stringsFromServer',{strings: 'PORTAMENT: ' + String(cmdState.PORTAMENT) + 'sec', timeout: true})
      stringEmit(io, "PORTAMENT: " + String(cmdState.PORTAMENT) + "sec");
      break;
    case "SAMPLERATE":
      let sampleRate = 44100;
      if (arg && isFinite(Number(arg.value))) {
        sampleRate = arg.value;
      } else {
        const sampleArr = Object.values(sampleRateState.sampleRate);
        const sum = sampleArr.reduce((accumulator, currentValue) => {
          return accumulator + currentValue;
        });
        const average = sum / sampleArr.length;
        if (average < 11025 || average >= 88200) {
          sampleRate = 11025;
        } else if (average < 22050) {
          sampleRate = 22050;
        } else if (average < 44100) {
          sampleRate = 44100;
        } else {
          sampleRate = 88200;
        }
      }
      if (arg && arg.property) {
        // console.log("hit source");
        sampleRateState.sampleRate[arg.property] = sampleRate;
        // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(sampleRateState.sampleRate[arg.source]) + 'Hz', timeout: true})
        stringEmit(
          io,
          "SampleRate: " +
            String(sampleRateState.sampleRate[arg.property]) +
            "Hz"
          // state
        );
      } else {
        console.log(arg);
        for (let target in sampleRateState.sampleRate) {
          sampleRateState.sampleRate[target] = sampleRate;
        }
        // io.emit('stringsFromServer',{strings: 'SampleRate: ' + String(sampleRateState.sampleRate.CHAT) + 'Hz', timeout: true})
        stringEmit(
          io,
          "SampleRate: " + String(sampleRateState.sampleRate.CHAT) + "Hz"
          // state
        );
      }
      break;
    case "GLITCH":
      if (arg && arg.property) {
        glitchState.glitch[arg.property] = !glitchState.glitch[arg.property];
        // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(glitchState.glitch[arg.source]), timeout: true})
        // console.log(arg.property, glitchState.glitch);
        // console.log(
        //   `GLITCH ${arg.property}: ${glitchState.glitch[arg.property]}`
        // );
        stringEmit(
          io,
          `GLITCH ${arg.property}: ${glitchState.glitch[arg.property]}`,
          true
          // state
        );
      } else {
        let flag = false;
        if (Object.values(glitchState.glitch).includes(false)) {
          flag = true;
        }
        for (let target in glitchState.glitch) {
          glitchState.glitch[target] = flag;
        }
        // io.emit('stringsFromServer',{strings: 'GLITCH: ' + String(glitchState.glitch.CHAT), timeout: true})
        stringEmit(io, "GLITCH: " + String(glitchState.glitch.CHAT), true);
      }
      break;
    case "GRID":
      if (arg && arg.property) {
        streamState.grid[arg.property] = !streamState.grid[arg.property];
        // io.emit('stringsFromServer',{strings: 'GRID: ' + String(streamState.grid[arg.property]) + '(' + arg.property + ')', timeout: true})
        stringEmit(
          io,
          "GRID: " +
            String(streamState.grid[arg.property]) +
            "(" +
            arg.property +
            ")"
          // state
        );
      } else {
        let flag = false;
        if (Object.values(streamState.grid).includes(false)) {
          flag = true;
        }
        for (let target in streamState.grid) {
          streamState.grid[target] = flag;
        }
        // io.emit('stringsFromServer',{strings: 'GRID: ' + String(streamState.grid.CHAT), timeout: true})
        stringEmit(io, "GRID: " + String(streamState.grid.CHAT));
      }
      break;
    case "BPM":
      if (arg && arg.value) {
        const latency = (60 * 1000) / arg.value;
        const bar = millisecondsPerBar(arg.value);

        if (arg.property) {
          // propertyがSTREAMを指定している場合
          if (
            quantizeState[arg.property] === undefined ||
            Object.keys(quantizeState[arg.property]).length === 0
          ) {
            quantizeState[arg.property] = {};
            for (const client in clientState.client) {
              quantizeState[arg.property][client] = {
                flag: false,
                bpm: arg.value,
                beat: 0,
              };
            }
          } else {
            for (let client in clientState.client) {
              quantizeState[arg.property][client].bpm = arg.value;
            }
          }
          if (Object.keys(streamState.latency).includes(arg.property)) {
            streamState.latency[arg.property] = latency;
            // cmdState.METRONOME = {};
            io.emit("bpmFromServer", { bpm: arg.value, bar: bar });

            // stringEmit(
            //   io,
            //   "BPM: " + String(arg.value) + "(" + arg.property + ")"
            //   // state
            // );
            // propertyが端末番号を指定している場合
          } else if (/^([1-9]\d*|0)(\.\d+)?$/.test(arg.property)) {
            const target = Object.keys(clientState.client)[
              Number(arg.property)
            ];
            if (Object.keys(cmdState.METRONOME).includes(target)) {
              cmdState.METRONOME[target] = latency;
              bpmState.client[target] = arg.value;
              io.to(target).emit("bpmFromServer", {
                bpm: arg.value,
                bar: bar,
              });
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
              putCmd(io, [target], cmd);
              io.to(target).emit("bpmFromServer", {
                bpm: arg.value,
                bar: bar,
              });
            }
          }
          // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value)  + '(' + arg.property + ')', timeout: true})
        } else {
          for (let target in streamState.latency) {
            streamState.latency[target] = latency;
          }
          for (let target in cmdState.METRONOME) {
            cmdState.METRONOME[target] = latency;
          }
          for (let target in bpmState.client) {
            bpmState.client[target] = arg.value;
          }

          for (let stream in streamState.target) {
            if (quantizeState[stream] === undefined) {
              quantizeState[stream] = {};
              for (const client in clientState.client) {
                quantizeState[stream][client] = {
                  flag: false,
                  bpm: arg.value,
                  beat: 0,
                };
              }
            } else {
              for (let client in clientState.client) {
                if (!Object.keys(quantizeState[stream]).includes(client)) {
                  quantizeState[stream][client] = {
                    flag: false,
                    bpm: arg.value,
                    beat: 0,
                  };
                } else {
                  quantizeState[stream][client].bpm = arg.value;
                }
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
              putCmd(io, [target], cmd);
            });
          }
          io.emit("bpmFromServer", { bpm: arg.value, bar: bar });

          stringEmit(io, "BPM: " + String(arg.value));
          io.emit("bpmFromServer", {
            bpm: arg.value,
            bar: bar,
          });
          // io.emit('stringsFromServer',{strings: 'BPM: ' + String(arg.value), timeout: true})
        }
      }
      break;
    case "RANDOM":
      // if (arg && arg.source) {
      //   streamState.random[arg.source] = !streamState.random[arg.source];
      //   // io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(streamState.random[arg.source]), timeout: true})
      //   stringEmit(
      //     io,
      //     "RANDOM: " + String(streamState.random[arg.source])
      //     // state
      //   );
      // } else {
      let flag = false;
      console.log(Object.values(streamState.random));
      if (Object.values(streamState.random).includes(false)) {
        flag = true;
      }
      for (let target in streamState.random) {
        console.log(target, flag);
        streamState.random[target] = flag;
      }
      //io.emit('stringsFromServer',{strings: 'RANDOM: ' + String(streamState.random.CHAT), timeout: true})
      stringEmit(io, "RANDOM: " + String(streamState.random.CHAT));
      // }
      console.log(streamState.random);
      break;
    case "VOICE":
      if (arg && arg.source) {
        if (arg.value === undefined) {
          let flag = false;
          if (cmdState.VOICE.includes(arg.source)) {
            // sourceが既にVOICEに含まれている場合取り除く
            const arr = [];
            for (let i = 0; i < cmdState.VOICE.length; i++) {
              if (cmdState.VOICE[i] === arg.source) {
                continue;
              } else {
                arr.push(cmdState.VOICE[i]);
              }
            }
            cmdState.VOICE = arr;
            // cmdState.VOICE.filter((id) => {
            // })
            console.log(cmdState.VOICE);
          } else {
            cmdState.VOICE.push(arg.source);
            flag = true;
          }
          // io.emit('stringsFromServer',{strings: 'VOICE: ' + String(flag), timeout: true})
          stringEmit(io, "VOICE: " + String(flag), true, arg.source);
          notTargetEmit(arg.source, Object.keys(clientState.client), io);
        } else {
          if (arg.value === 0) {
            let filtered: string[] = cmdState.VOICE.filter(
              (element) => element !== arg.source
            );
            cmdState.VOICE = filtered;
            stringEmit(io, "VOICE: false", true, arg.source);
            notTargetEmit(arg.source, Object.keys(clientState.client), io);
          } else {
            if (!cmdState.VOICE.includes(arg.source)) {
              cmdState.VOICE.push(arg.source);
            }
            stringEmit(io, "VOICE: true", true, arg.source);
            notTargetEmit(arg.source, Object.keys(clientState.client), io);
          }
        }
      }
      break;
  }
};
