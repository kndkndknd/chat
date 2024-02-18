import { cmdList, streamList, parameterList } from "../states.js";
import { streamEmit } from "../stream/streamEmit.js";
import { cmdEmit } from "./cmdEmit.js";
import { stopEmit } from "./stopEmit.js";
import { splitSpace } from "./splitSpace.js";
import { splitPlus } from "./splitPlus.js";
import { sinewaveEmit } from "./sinewaveEmit.js";
import { sinewaveChange } from "./sinewaveChange.js";
import { parameterChange } from "./parameterChange.js";
import { voiceEmit } from "./voiceEmit.js";
import { chatPreparation } from "../stream/chatPreparation.js";
import { millisecondsPerBar, secondsPerEighthNote } from "./bpmCalc.js";
// import { putString } from "./putString";
import { recordEmit } from "../stream/recordEmit.js";
import { switchCtrl } from "../arduinoAccess/arduinoAccess.js";
export const receiveEnter = (strings, id, io, state) => {
    //VOICE
    voiceEmit(io, strings, state);
    /*
    if(strings === 'INSERT') {
      const result = postMongo()
    }
    */
    if (strings === "CHAT") {
        chatPreparation(io, state);
    }
    else if (strings === "RECORD" || strings === "REC") {
        recordEmit(io, state);
        /*
        if (!state.current.RECORD) {
          state.current.RECORD = true;
          io.emit("recordReqFromServer", { target: "PLAYBACK", timeout: 10000 });
          if (state.cmd.VOICE.length > 0) {
            state.cmd.VOICE.forEach((element) => {
              //          io.to(element).emit('voiceFromServer', 'RECORD')
              io.to(element).emit("voiceFromServer", {
                text: "RECORD",
                lang: state.cmd.voiceLang,
              });
            });
          }
        } else {
          state.current.RECORD = false;
        }
        */
    }
    else if (strings.includes(" ") /*&& strings.split(" ").length < 4*/) {
        splitSpace(strings.split(" "), io, state);
    }
    else if (strings.includes("+")) {
        splitPlus(strings.split("+"), io, state);
    }
    else if (streamList.includes(strings)) {
        console.log("in stream");
        streamEmit(strings, io, state);
    }
    else if (Object.keys(cmdList).includes(strings)) {
        console.log("in cmd");
        cmdEmit(cmdList[strings], io, state);
    }
    else if (Number.isFinite(Number(strings))) {
        console.log("sinewave");
        sinewaveEmit(Number(strings), io, state);
    }
    else if (strings === "STOP") {
        console.log("stop");
        stopEmit(io, state, "ALL");
    }
    else if (strings === "QUANTIZE") {
        state.stream.quantize = !state.stream.quantize;
        for (let key in state.bpm) {
            const bar = millisecondsPerBar(state.bpm[key]);
            const eighthNote = secondsPerEighthNote(state.bpm[key]);
            io.to(key).emit("quantizeFromServer", {
                flag: state.stream.quantize,
                bpm: state.bpm[key],
                bar: bar,
                eighthNote: eighthNote,
            });
        }
    }
    else if (strings === "TWICE" || strings === "HALF") {
        sinewaveChange(strings, io, state);
        // } else if (strings === 'PREVIOUS' || strings === 'PREV') {
        // previousCmd(io, state)
    }
    else if (Object.keys(parameterList).includes(strings)) {
        parameterChange(parameterList[strings], io, state, { source: id });
    }
    else if (strings === "NO" || strings === "NUMBER") {
        state.client.forEach((id, index) => {
            console.log(id);
            io.to(id).emit("stringsFromServer", {
                strings: String(index),
                timeout: true,
            });
            //putString(io, String(index), state)
        });
        // 20230923 sinewave Clientの表示
        state.sinewaveClient.forEach((id, index) => {
            console.log(id);
            io.to(id).emit("stringsFromServer", {
                strings: String(index) + "(sinewave)",
                timeout: true,
            });
            //putString(io, String(index), state)
        });
    }
    else if (strings === "SWITCH") {
        const switchState = state.arduino.relay === "on" ? "OFF" : "ON";
        console.log(switchState);
        io.emit("stringsFromServer", {
            strings: "SWITCH " + switchState,
            timeout: true,
        });
        switchCtrl().then((result) => {
            console.log(result);
        });
    }
    else if (strings === "CLOCK") {
        /*
        state.clockMode = !state.clockMode;
        console.log(state.clockMode);
        io.to(id).emit("clockModeFromServer", { clockMode: state.clockMode });
        */
        io.emit("clockFromServer", {
            clock: true,
            // 暫定
            barLatency: state.stream.latency.CHAT * 4,
        });
    }
    if (strings !== "STOP") {
        state.previous.text = strings;
    }
};
//# sourceMappingURL=receiveEnter.js.map