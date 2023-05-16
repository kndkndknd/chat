"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.charProcess = void 0;
const receiveEnter_1 = require("./receiveEnter");
const stopEmit_1 = require("../cmd/stopEmit");
function charProcess(character, strings, id, io, state) {
    //console.log(character)
    if (character === 'Enter') {
        (0, receiveEnter_1.receiveEnter)(strings, id, io, state);
        strings = '';
    }
    else if (character === 'Tab' || character === 'ArrowRight' || character === 'ArrowDown') {
        io.emit('erasePrintFromServer', '');
        strings = '';
    }
    else if (character === 'ArrowLeft' || character === 'Backspace') {
        strings = strings.slice(0, -1);
        io.emit('stringsFromServer', { strings: strings, timeout: false });
    }
    else if (character === 'Escape') {
        (0, stopEmit_1.stopEmit)(io, state);
        strings = '';
    }
    else if (character === 'BASS') {
        console.log('io.to(' + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})');
        io.to(id).emit('cmdFromServer', { 'cmd': 'BASS', 'property': 'LOW' });
    }
    else if (character === 'BASSS') {
        console.log('io.to(' + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})');
        io.to(id).emit('cmdFromServer', { 'cmd': 'BASS', 'property': 'HIGH' });
    }
    else if (character === 'ArrowUp') {
        io.emit('stringsFromServer', { strings: strings, timeout: false });
    }
    else if (character != undefined) {
        strings = strings + character;
        io.emit('stringsFromServer', { strings: strings, timeout: false });
    }
    console.log(strings);
    return strings;
}
exports.charProcess = charProcess;
//# sourceMappingURL=charProcess.js.map