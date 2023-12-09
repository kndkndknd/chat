import { Socket } from "socket.io-client";
//import { initialize } from "./ts"
import { textPrint, erasePrint, eraseText } from "./imageEvent";
import { bass } from "./webaudio";
let bassFlag = false;

export const keyDown = (
  e: KeyboardEvent,
  stringsClient: string,
  socket: Socket,
  stx,
  strCnvs,
  ctx?,
  cnvs?
) => {
  let character: string;

  if (e.key) {
    character = e.key;
  } else {
    character = keyCode[e.keyCode];
  }
  /*
  if(character === 'Enter' && !start) {
    initialize()
  }
  */

  if (character === "\\") {
    bassFlag = !bassFlag;
    stringsClient = "BASS";
    bass(bassFlag, 0.4);
    if (bassFlag) {
      textPrint(stringsClient, stx, strCnvs);
    } else {
      erasePrint(stx, strCnvs);
    }
  } else if(character === 'Eisu' 
    || character == 'Meta' 
    || character === 'Shift'
    || character === 'Control'
    || character === 'Alt'
  ) {
    console.log(character + ' pressed')
  } else {
    if (character === " ") {
    }
    if (/\w/.test(character) && character.length === 1) {
      stringsClient = stringsClient + character.toUpperCase();
      socket.emit("charFromClient", character.toUpperCase());
    } else {
      socket.emit("charFromClient", character);
    }

    console.log(character);

    if (character === "Enter" && stringsClient != "VOICE") stringsClient = "";
    //  erasePrint('strings', stx, strCnvs)
    eraseText(stx, strCnvs);
    textPrint(stringsClient, stx, strCnvs);
    //  if(ctx) erasePrint('canvas', ctx, cnvs)
  }

  return stringsClient;
};

export const keyCode = {
  "48": "0",
  "49": "1",
  "50": "2",
  "51": "3",
  "52": "4",
  "53": "5",
  "54": "6",
  "55": "7",
  "56": "8",
  "57": "9",
  "65": "A",
  "66": "B",
  "67": "C",
  "68": "D",
  "69": "E",
  "70": "F",
  "71": "G",
  "72": "H",
  "73": "I",
  "74": "J",
  "75": "K",
  "76": "L",
  "77": "M",
  "78": "N",
  "79": "O",
  "80": "P",
  "81": "Q",
  "82": "R",
  "83": "S",
  "84": "T",
  "85": "U",
  "86": "V",
  "87": "W",
  "88": "X",
  "89": "Y",
  "90": "Z",
  "8": "Backspace",
  "13": "Enter",
  "17": "Control",
  "18": "Alt",
  "9": "Tab",
  "32": " ",
  "27": "Escape",
  "37": "ArrowLeft",
  "38": "ArrowUp",
  "39": "ArrowRight",
  "40": "ArrowDown",
  "188": ",",
  "186": ":",
  "190": ".",
  "189": "-",
  "226": "BASS",
  "220": "BASS",
  "191": "/",
  "219": "[",
  "221": "]",
  "222": "'",
  "187": ";",
};

const shiftKeyMap = {
  "49": "!",
  "50": "'",
  "51": "#",
  "52": "$",
  "53": "%",
  "54": "&",
  "55": '"',
  "56": "(",
  "57": ")",
  "188": "<",
  "190": ">",
  "189": "=",
  "226": "_",
  "220": "_",
  "191": "?",
  "219": "{",
  "221": "}",
  "222": '"',
  "187": "+",
  "186": "+",
  "192": "BASSS",
  "65": "A",
  "66": "B",
  "67": "C",
  "68": "D",
  "69": "E",
  "70": "F",
  "71": "G",
  "72": "H",
  "73": "I",
  "74": "J",
  "75": "K",
  "76": "L",
  "77": "M",
  "78": "N",
  "79": "O",
  "80": "P",
  "81": "Q",
  "82": "R",
  "83": "S",
  "84": "T",
  "85": "U",
  "86": "V",
  "87": "W",
  "88": "X",
  "89": "Y",
  "90": "Z",
  "13": "enter",
  "17": "ctrl",
  "36": "home",
  "18": "alt",
  "9": "tab",
  "32": " ",
  "107": "add",
  "20": "caps_lock",
  "27": "escape",
  "37": "left_arrow",
  "38": "up_arrow",
  "39": "right_arrow",
  "40": "down_arrow",
  "112": "f1",
  "113": "f2",
  "114": "f3",
  "115": "f4",
  "116": "f5",
  "117": "f6",
  "118": "f7",
  "119": "f8",
  "120": "f9",
  "121": "f10",
  "122": "f11",
  "123": "f12",
};
