"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charProcess = void 0;
const state_1 = require("../state");
const ioState_1 = require("../state/states/ioState");
const receiveEnter_1 = require("./receiveEnter");
const stopEmit_1 = require("./stopEmit");
const metronomeBpmSet_1 = require("./metronomeBpmSet");
const ioEmit_1 = require("../socket/ioEmit");
const getLogCmd_1 = require("../logging/getLogCmd");
const cmdLogging_1 = require("../logging/cmdLogging");
// import { get } from "http";
let cmdLogNum = 0;
function charProcess(character, strings, id) {
    //console.log(character)
    if (character === "Enter") {
        (0, receiveEnter_1.receiveEnter)(strings, id);
        (0, getLogCmd_1.resetCmdLogNum)();
        strings = "";
    }
    else if (character === "ArrowUp" || character === "ArrowDown") {
        // if (character === "ArrowUp") {
        //   cmdLogNum++;
        // } else if (character === "ArrowDown" && cmdLogNum > 0) {
        //   cmdLogNum--;
        // }
        // strings = getLogCmd(cmdLogNum);
        strings = (0, getLogCmd_1.getLogCmd)(character);
        (0, ioEmit_1.stringEmit)(strings, false);
    }
    else if (character === "Tab" || character === "ArrowRight") {
        ioState_1.ioState?.io.emit("erasePrintFromServer", "");
        strings = "";
    }
    else if (character === "ArrowLeft" || character === "Backspace") {
        strings = strings.slice(0, -1);
        ioState_1.ioState?.io.emit("stringsFromServer", { strings: strings, timeout: false });
    }
    else if (character === "Escape") {
        // const client: 'client' | 'sinewaveClient' = state.sinewaveMode ? "sinewaveClient" : "client";
        // console.log(client)
        console.log("cmdLogging in Escape");
        (0, cmdLogging_1.cmdLogging)("STOP");
        (0, stopEmit_1.stopEmit)(id, "ALL");
        strings = "";
    }
    else if (character === "BASS") {
        console.log("cmdLogging in BASS");
        (0, cmdLogging_1.cmdLogging)("BASS");
        state_1.previousState.text = "BASS";
    }
    else if (character === "BASSS") {
        console.log("cmdLogging in BASS");
        (0, cmdLogging_1.cmdLogging)("BASS");
        console.log("io.to(" + id + ').emit("cmdFromServer",{"cmd":"BASS","property":"HIGH"})');
        ioState_1.ioState?.io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "HIGH" });
        state_1.previousState.text = "BASSS";
    }
    else if (character === "ArrowDown") {
        strings = "";
    }
    else if (character === "ArrowUp") {
        console.log("up arrow");
        console.log(state_1.previousState.text);
        strings = state_1.previousState.text;
        ioState_1.ioState?.io.emit("stringFromServer", { strings: strings, timeout: false });
    }
    else if (character === " " && strings === "") {
        (0, metronomeBpmSet_1.metronomeBpmSet)(id);
    }
    else if (character === "Shift") {
    }
    else if (character != undefined) {
        strings = strings + character;
        // if (!state.emoji) {
        (0, ioEmit_1.stringEmit)(strings, false);
        // io.emit("stringsFromServer", { strings: strings, timeout: false });
        // } else {
        // stringEmit(io, emoji.random().emoji, false);
        // io.emit("stringsFromServer", { strings: strings, timeout: false });
        // }
    }
    console.log(strings);
    return strings;
}
exports.charProcess = charProcess;
//# sourceMappingURL=charProcess.js.map