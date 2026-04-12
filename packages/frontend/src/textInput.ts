import { textPrint, erasePrint, eraseText } from "./canvasEvent";
import { bass } from "./webaudio";
import { postChar } from "./postMessage/postChar";
// import { frontState } from "./globalVariable";
let bassFlag = false;

export const keyDown = (e: KeyboardEvent, stringsClient: string) => {
  let character: string;

  character = e.key;

  if (character === "\\") {
    bassFlag = !bassFlag;
    stringsClient = "BASS";
    bass(bassFlag, 0.4);
    if (bassFlag) {
      textPrint(stringsClient);
    } else {
      erasePrint();
    }
  } else if (
    character === "Eisu" ||
    character == "Meta" ||
    character === "Shift" ||
    character === "Control" ||
    character === "Alt"
  ) {
    console.log(character + " pressed");
  } else {
    if (character === " ") {
    }
    if (/\w/.test(character) && character.length === 1) {
      stringsClient = stringsClient + character.toUpperCase();
      postChar(character.toUpperCase());
      console.log("posting char:", character.toUpperCase());
    } else {
      postChar(character);
      console.log("posting char:", character);
    }

    console.log(character);

    if (character === "Enter" && stringsClient != "VOICE") stringsClient = "";
    //  erasePrint('strings', stx, strCnvs)
    eraseText();
    textPrint(stringsClient);
    //  if(ctx) erasePrint('canvas', ctx, cnvs)
  }

  return stringsClient;
};
