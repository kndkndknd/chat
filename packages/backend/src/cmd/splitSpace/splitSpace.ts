import SocketIO from "socket.io";
import { cmdStateType } from "../../../../types/global";
import {
  cmdList,
  streamList,
  parameterList,
  states,
  streams,
} from "../../states";
import { cmdEmit } from "../cmdEmit";
import { sinewaveEmit } from "../sinewaveEmit";
import { parameterChange } from "../parameterChange";

import { putCmd } from "../putCmd";
import { stringEmit } from "../../socket/ioEmit";
// import { putString } from "./putString";

import { insertStream } from "../../mongoAccess/insertStream";
import { findStream } from "../../mongoAccess/findStream";
import { stopEmit } from "../stopEmit";
import { numTarget } from "./numTarget";
import { fadeCmd } from "./fadeCmd";
import { splitStop } from "./splitStop";
import { solo } from "./solo";

import { recordEmit, recordAsOtherEmit } from "../../stream/recordEmit";
import { chatPreparation } from "../../stream/chatPreparation";
import { streamEmit } from "../../stream/streamEmit";
import { helpPrint } from "../help";
import { getLiveStream } from "../../stream/getLiveStream";
import { getTimeLine } from "./getTimeLine";
import { connectTest, switchCramp } from "../../arduinoAccess/arduinoAccess";
// import { uploadStreamModule } from "../../stream/uploadModule/uploadStream";
import { uploadStream } from "../../stream/uploadModule/uploadStream";
import { voiceEmit } from "../voiceEmit";

import { loadScenario } from "../../scenario/loadScenario";
import { execScenario } from "../../scenario/execScenario";
import { bufferSizeChange } from "../../stream/bufferSizeChange";
import { modulationByBPM } from "./modulationByBPM";

import { putLogFile } from "../../logging/putLogFile";
import { text } from "stream/consumers";
import { splitQuantize } from "./splitQuantize";

import { scheduleSplitCmd } from "../../schedule/scheduleSplitCmd";
import { getScheduleFromSplitSpace } from "../../schedule/getScheduleFromSplitSpace";
import { deleteLog } from "../../logging/deleteLog";

export const splitSpace = async (
  stringArr: Array<string>,
  io: SocketIO.Server,
  state: cmdStateType,
  source?: string
) => {
  const arrTypeArr = stringArr.map((string) => {
    if (/^([1-9]\d*|0)(\.\d+)?$/.test(string)) {
      return "number";
    } else if (/^[A-Za-z]*$/.test(string)) {
      return "string";
    } else {
      return "other";
    }
  });
  // console.log(arrTypeArr)
  // console.log(stringArr)

  if (arrTypeArr[0] === "number") {
    numTarget(stringArr, arrTypeArr, io, state);
    if (stringArr[1] !== "VOICE") {
      voiceEmit(io, stringArr.slice(1).join(" "), source, state);
    }
  } else if (stringArr[0] === "HELP") {
    helpPrint(stringArr.slice(1), io);
  } else if (stringArr[1] === "SOLO") {
    solo(stringArr, arrTypeArr, state, io);
  } else if (stringArr[0] === "CLEAR") {
    if (stringArr[1] === "BUFFER") {
      for (let stream in streams) {
        if (
          stream !== "CHAT" &&
          stream !== "EMPTY" &&
          stream !== "KICK" &&
          stream !== "SNARE" &&
          stream !== "HAT"
        ) {
          streams[stream].audio = [];
          streams[stream].video = [];
        }
      }
    } else if (streamList.includes(stringArr[1])) {
      streams[stringArr[1]].audio = [];
      streams[stringArr[1]].video = [];
    } else if (stringArr[1] === "INDEX") {
      for (let stream in streams) {
        streams[stream].index = 0;
      }
    }
    // } else if (stringArr[0] === "FADE" && Object.keys(cmdList).includes(stringArr[1])) {
  } else if (stringArr[0] === "FADE") {
    fadeCmd(stringArr, arrTypeArr, io, state);
    voiceEmit(io, stringArr.join(" "), source, state);
  } else if (Object.keys(parameterList).includes(stringArr[0])) {
    // RANDOMのみRATEとSTREAMがあるので個別処理
    if (stringArr[0] === "RANDOM") {
      if (stringArr[1] === "RATE") {
        // SAMPLERATEのランダマイズ
        console.log("random rate");
        if (stringArr.length === 2) {
          for (let key in state.stream.randomrate) {
            state.stream.randomrate[key] = !state.stream.randomrate[key];
          }
          // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
          stringEmit(
            io,
            "SAMPLERATE RANDOM: " + String(state.stream.randomrate.CHAT)
            // state
          );
        } else if (
          stringArr.length === 3 &&
          Object.keys(state.stream.randomrate).includes(stringArr[2])
        ) {
          state.stream.randomrate[stringArr[2]] =
            !state.stream.randomrate[stringArr[2]];
          //io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM(' + stringArr[2] + '): ' + String(state.stream.randomrate[stringArr[2]]), timeout: true})
          stringEmit(
            io,
            "SAMPLERATE RANDOM(" +
              stringArr[2] +
              "): " +
              String(state.stream.randomrate[stringArr[2]])
            // state
          );
        } else if (stringArr.length === 3 && stringArr[2].includes("-")) {
          const rateRangeArr = stringArr[2].split("-");
          // rateRangeArrが2つの数字で構成されているか確認
          if (
            rateRangeArr.length === 2 &&
            rateRangeArr.every((item) => {
              return !isNaN(Number(item));
            })
          ) {
            if (
              Number(rateRangeArr[0]) >= 4000 &&
              Number(rateRangeArr[1]) <= 132300
            ) {
              for (let key in state.stream.randomraterange) {
                state.stream.randomraterange[key].min = Number(rateRangeArr[0]);
                state.stream.randomraterange[key].max = Number(rateRangeArr[1]);
              }
            } else {
              stringEmit(io, "OUT RATE RANGE: 4000-132300", true);
            }
          }
        } else if (
          stringArr.length === 4 &&
          Object.keys(state.stream.randomrate).includes(stringArr[2])
        ) {
          const rateRangeArr = stringArr[3].split("-");
          if (
            rateRangeArr.length === 2 &&
            rateRangeArr.every((item) => {
              return !isNaN(Number(item));
            })
          ) {
            state.stream.randomraterange[stringArr[2]].min = Number(
              rateRangeArr[0]
            );
            state.stream.randomraterange[stringArr[2]].max = Number(
              rateRangeArr[1]
            );
          }
        } else if (stringArr.length === 3 && stringArr[2] === "NOTE") {
          for (let key in state.stream.randomratenote) {
            state.stream.randomratenote[key] =
              !state.stream.randomratenote[key];
          }
          // io.emit('stringsFromServer',{strings: 'SAMPLERATE RANDOM: ' + String(state.stream.randomrate.CHAT), timeout: true})
          stringEmit(
            io,
            "SAMPLERATE RANDOM(NOTE): " +
              String(state.stream.randomratenote.CHAT)
            // state
          );
        }
        console.log(state.stream.randomrate);
      }
    } else if (stringArr[0] === "VOICE") {
      //  } else if (stringArr[0] === 'VOICE' && stringArr.length === 2 && arrTypeArr[1] === 'string') {
      if (stringArr[1] === "JA" || stringArr[1] === "JP") {
        state.cmd.voiceLang = "ja-JP";
        stringEmit(io, "VOICE: ja-JP");
      } else if (stringArr[1] === "EN" || stringArr[1] === "US") {
        state.cmd.voiceLang = "en-US";
        stringEmit(io, "VOICE: en-US");
      } else {
        const voiceText = stringArr.slice(1).join(" ");
        voiceEmit(io, voiceText, "all", state);
      }
    } else {
      let argVal: number;
      let argProp: string;
      console.log(stringArr);
      console.log(arrTypeArr);
      if (stringArr.length === 2 && arrTypeArr[1] === "number") {
        argVal = Number(stringArr[1]);
      } else if (stringArr.length === 2 && arrTypeArr[1] === "string") {
        argProp = stringArr[1];
      } else if (stringArr.length === 3) {
        if (arrTypeArr[1] === "string" && arrTypeArr[2] === "number") {
          argProp = stringArr[1];
          argVal = Number(stringArr[2]);
        } else if (
          stringArr[0] === "BPM" &&
          arrTypeArr[1] === "number" &&
          arrTypeArr[2] === "number"
        ) {
          argProp = stringArr[1];
          argVal = Number(stringArr[2]);
        }
      }
      parameterChange(parameterList[stringArr[0]], io, state, {
        value: argVal,
        property: argProp,
      });
      // stringEmit(io, stringArr[0] + " " + stringArr[1]);
    }
  } else if (stringArr[0] === "ALL") {
    voiceEmit(io, stringArr.join(" "), source, state);

    if (arrTypeArr[1] === "string") {
      Object.keys(state.client).forEach((target) => {
        cmdEmit(stringArr[1], io, state, target);
      });
    } else if (arrTypeArr[1] === "number") {
      Object.keys(state.client).forEach((target) => {
        sinewaveEmit(Number(stringArr[1]), io, state, target);
      });
    }
  } else if (stringArr[0] === "STOP") {
    voiceEmit(io, stringArr.join(" "), source, state);

    splitStop(stringArr, state, io);
    // } else if (stringArr[0] === "FADE") {
  } else if (stringArr[0] === "UPLOAD" && stringArr.length == 2) {
    voiceEmit(io, stringArr.join(" "), source, state);

    // const uploadResult = await uploadStream(stringArr);
    // uploadStream(stringArr, io);
    const result = await uploadStream(stringArr);
    console.log(result);
    stringEmit(io, result, true);
  } else if (
    stringArr[0] === "GAIN" &&
    stringArr.length === 3 &&
    Object.keys(state.cmd.GAIN).includes(stringArr[1]) &&
    arrTypeArr[2] === "number"
  ) {
    state.cmd.GAIN[stringArr[1]] = Number(stringArr[2]);
    console.log(state.cmd.GAIN);
    stringEmit(io, stringArr[1] + " GAIN: " + stringArr[2]);
    // 動作確認用

    // } else if (stringArr[0] === 'FIND' && stringArr.length === 3) {
    // findStream(stringArr[1], stringArr[2], io);
  } else if (stringArr[0] === "INSERT") {
    if (stringArr[1] === "HELP" || stringArr[1] === "?") {
      stringEmit(io, `INSERT (STREAM) (PLACE) (YYYMMDD)`, false);
    } else if (streamList.includes(stringArr[1])) {
      if (
        stringArr.length === 4 &&
        arrTypeArr[3] === "number" &&
        stringArr[3].length === 8
      ) {
        insertStream(stringArr[1], io, stringArr[2], stringArr[3]);
      } else {
        stringEmit(io, `INSERT (STREAM) (PLACE) (YYYMMDD)`, false);
      }
      // insertStream(stringArr[1], io);
    }

    /*
    if (
      stringArr.length === 2 &&
      Object.keys(state.stream.sampleRate).includes(stringArr[1])
    ) {
      insertStream(stringArr[1], io);
    }
    */
  } else if (stringArr[0] === "FIND") {
    findStream("test", "test", io);
  } else if (stringArr[0].includes(":")) {
    scheduleSplitCmd(stringArr, source, io);
  } else if (stringArr[0] === "SWITCH" || stringArr[0] === "ARDUINO") {
    if (stringArr[1] === "TEST") {
      console.log("switch test");
      connectTest().then((result) => {
        console.log(result);
        states.arduino.connected = result;
        io.emit("stringsFromServer", {
          strings: `${stringArr[0]}: ${String(states.arduino.connected)}`,
          timeout: true,
        });
      });
    } else if (stringArr[1] === "ADDRESS") {
      if (stringArr.length > 2) {
        state.arduino.host = stringArr[2];
      }
      io.emit("stringsFromServer", {
        // strings: "SWITCH HOST: " + states.arduino.host,
        strings: `${stringArr[0]} HOST: ${String(states.arduino.host)}`,
        timeout: true,
      });
    } else if (stringArr[1] === "FALSE") {
      states.arduino.connected = false;
      io.emit("stringsFromServer", {
        // strings: "SWITCH: " + String(states.arduino.connected),
        strings: `${stringArr[0]}: ${String(states.arduino.connected)}`,
        timeout: true,
      });
    }
  } else if (
    stringArr[1] === "CHAT" ||
    (streamList.includes(stringArr[1]) && stringArr[0] !== "GET")
  ) {
    console.log("route", stringArr);
    const targetArr = stringArr[0].split("-");
    if (
      targetArr.length > 1 &&
      targetArr.every((el) => {
        return !isNaN(Number(el)) && el !== "";
      })
    ) {
      console.log("targetArr", targetArr);
      const targetIdArr = targetArr.map((el) => {
        return Object.keys(state.client)[Number(el)];
      });
      console.log("targetIdArr", targetIdArr);
      state.stream.target[stringArr[1]] = targetIdArr;
      console.log(state.stream.target);
      if (stringArr[1] === "CHAT") {
        console.log("debug");
        chatPreparation(io, state);
      } else {
        streamEmit(stringArr[1], io, state);
      }
    }
  } else if (
    stringArr[0] === "RECORD" &&
    stringArr[1] === "AS" &&
    stringArr.length === 3
  ) {
    recordAsOtherEmit(io, state, stringArr[2]);
  } else if (stringArr[0] === "GET" || stringArr[0] === "YOUTUBE") {
    stringEmit(io, `GETTING ${stringArr.slice(1).join(" ")}...`, true);
    if (stringArr[1] === "LIVESTREAM") {
      if (stringArr.length === 2) {
        const result = await getLiveStream("LIVESTREAM");
        console.log("get livestream", result);
        if (result) {
          stringEmit(io, "GET LIVESTREAM: SUCCESS");
        } else {
          stringEmit(io, "GET LIVESTREAM: FAILED");
        }
      } else {
        const qWord = stringArr.slice(1).join(" ");
        console.log("qWord", qWord);
        const result = await getLiveStream("LIVESTREAM", qWord);
        console.log("get livestream", result);
        if (result) {
          stringEmit(io, "GET LIVESTREAM: SUCCESS");
        } else {
          stringEmit(io, "GET LIVESTREAM: FAILED");
        }
      }
    } else {
      const result = await getLiveStream(stringArr[1]);
      console.log("get livestream as ", stringArr[1], result);
      if (result) {
        stringEmit(io, "GET LIVESTREAM: SUCCESS");
      } else {
        stringEmit(io, "GET LIVESTREAM: FAILED");
      }
    }
  } else if (stringArr[0] === "TWITTER" || stringArr[0] === "X") {
    const result = await getTimeLine(stringArr, io, state);
    if (result) {
      //stringEmit(io, "GET TIMELINE: SUCCESS");
    } else {
      stringEmit(io, "GET TIMELINE: FAILED");
    }
  } else if (
    stringArr[0] === "GAIN" &&
    Object.keys(state.cmd.GAIN).includes(stringArr[1])
  ) {
    if (stringArr.length === 3 && arrTypeArr[2] === "number") {
      state.cmd.GAIN[stringArr[1]] = Number(stringArr[2]);
    }
    stringEmit(
      io,
      `${stringArr[1]} GAIN: ${String(state.cmd.GAIN[stringArr[1]])}`,
      true
    );
  } else if (stringArr[0] === "SCENARIO" || stringArr[0] === "START") {
    const scenario = await loadScenario(stringArr[1]);
    await execScenario(scenario, io);
  } else if (stringArr[0] === "VIDEO" || stringArr[0] === "HLS") {
    const cmd: {
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
    } = {
      cmd: "HLS",
      property: stringArr[1],
      value: 0,
      flag: true,
    };
    io.emit("cmdFromServer", cmd);
  } else if (
    stringArr[0] === "BUFFER" ||
    (stringArr[0] === "BUFFERSIZE" && arrTypeArr[1] === "number")
  ) {
    const input = Number(stringArr[1]);
    state.stream.basisBufferSize = bufferSizeChange(input);
    stringEmit(io, `BufferSize: ${state.stream.basisBufferSize}`);
  } else if (
    arrTypeArr[1] === "number" &&
    (stringArr[0] === "MODULATION" || stringArr[0] === "MOD")
  ) {
    const freqArr =
      stringArr.length === 3 && arrTypeArr[2] === "number"
        ? modulationByBPM(
            Number(stringArr[1]),
            Number(stringArr[2]),
            state.cmdClient
          )
        : modulationByBPM(
            Number(stringArr[1]),
            Object.values(state.bpm).reduce((acc, val) => acc + val, 0) /
              Object.values(state.bpm).length,
            state.cmdClient
          );
    freqArr.forEach((freq, index) => {
      sinewaveEmit(freq, io, state, state.cmdClient[index]);
    });
  } else if (stringArr[0] === "LOG") {
    if (stringArr[1] === "FILE") {
      const result = await putLogFile();
      if (result) {
        stringEmit(io, "LOG: PUT SUCCESS");
      } else {
        stringEmit(io, "LOG: PUT FAILED");
      }

      // console.log(result);
      // if(result) {
      //   stringEmit(io, "LOG: SUCCESS");
      // } else {
      //   stringEmit(io, "LOG: FAILED");
      // }
    } else if (stringArr[1] === "IMPORT") {
      const result = getScheduleFromSplitSpace(stringArr, io);
      if (!result) {
        stringEmit(io, "LOG: IMPORT FAILED");
      }
    } else if (stringArr[1] === "CLEAR") {
      deleteLog();
    }
  } else if (stringArr[0] === "QUANTIZE") {
    splitQuantize(io, state, stringArr, arrTypeArr);
  } else {
    stringEmit(io, stringArr.join(" "), false);
    if (state.cmd.VOICE.length > 0) {
      console.log("voiceEmit split space");
      voiceEmit(io, stringArr.join(" "), "scenario", state);
    }
  }
};
