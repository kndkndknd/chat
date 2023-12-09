"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charProcess = void 0;
const receiveEnter_1 = require("./receiveEnter");
const stopEmit_1 = require("./stopEmit");
const metronomeBpmSet_1 = require("./metronomeBpmSet");
function charProcess(character, strings, id, io, state) {
    //console.log(character)
    if (character === "Enter") {
        (0, receiveEnter_1.receiveEnter)(strings, id, io, state);
        strings = "";
    }
    else if (character === "Tab" ||
        character === "ArrowRight" ||
        character === "ArrowDown") {
        io.emit("erasePrintFromServer", "");
        strings = "";
    }
    else if (character === "ArrowLeft" || character === "Backspace") {
        strings = strings.slice(0, -1);
        io.emit("stringsFromServer", { strings: strings, timeout: false });
    }
    else if (character === "Escape") {
        // const client: 'client' | 'sinewaveClient' = state.sinewaveMode ? "sinewaveClient" : "client";
        // console.log(client)
        (0, stopEmit_1.stopEmit)(io, state, 'ALL', 'all');
        strings = "";
    }
    else if (character === "BASS") {
        console.log("io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})');
        io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "LOW" });
        state.previous.text = "BASS";
    }
    else if (character === "BASSS") {
        console.log("io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})');
        io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "HIGH" });
        state.previous.text = "BASSS";
    }
    else if (character === "ArrowDown") {
        strings = "";
    }
    else if (character === "ArrowUp") {
        console.log("up arrow");
        console.log(state.previous.text);
        strings = state.previous.text;
        io.emit("stringFromServer", { strings: strings, timeout: false });
    }
    else if (character === " " && strings === "") {
        (0, metronomeBpmSet_1.metronomeBpmSet)(io, state, id);
    }
    else if (character === "Shift") {
    }
    else if (character != undefined) {
        strings = strings + character;
        io.emit("stringsFromServer", { strings: strings, timeout: false });
    }
    console.log(strings);
    return strings;
}
exports.charProcess = charProcess;
//# sourceMappingURL=charProcess.js.map