import { charState, previousState } from "../state";
import { receiveEnter } from "./receiveEnter";
import { stopEmit } from "./stopEmit";
import { metronomeBpmSet } from "./metronomeBpmSet";
import { stringEmit } from "../socket/ioEmit";
import { getLogCmd, resetCmdLogNum } from "../logging/getLogCmd";
import { cmdLogging } from "../logging/cmdLogging";
import { targetEmit, broadcastEmit } from "../webSocket";
// import { get } from "http";

let cmdLogNum = 0;

export function charProcess(character: string, id: string) {
  //console.log(character)
  if (character === "Enter") {
    receiveEnter(charState.strings, id);
    resetCmdLogNum();
    charState.strings = "";
  } else if (character === "ArrowUp" || character === "ArrowDown") {
    // if (character === "ArrowUp") {
    //   cmdLogNum++;
    // } else if (character === "ArrowDown" && cmdLogNum > 0) {
    //   cmdLogNum--;
    // }
    // strings = getLogCmd(cmdLogNum);
    charState.strings = getLogCmd(character);
    stringEmit(charState.strings, false);
  } else if (character === "Tab" || character === "ArrowRight") {
    // io.emit("erasePrintFromServer", "");
    broadcastEmit({ type: "string", payload: { string: "", timeout: false } });
    charState.strings = "";
  } else if (character === "ArrowLeft" || character === "Backspace") {
    charState.strings = charState.strings.slice(0, -1);
    stringEmit(charState.strings, false);
  } else if (character === "Escape") {
    // const client: 'client' | 'sinewaveClient' = state.sinewaveMode ? "sinewaveClient" : "client";
    // console.log(client)
    cmdLogging("STOP");
    stopEmit("ALL");
    charState.strings = "";
  } else if (character === "BASS") {
    cmdLogging("BASS");
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})',
    );
    targetEmit(id, {
      type: "cmd",
      payload: { cmd: "BASS", option: { property: "LOW" } },
    });
    // io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "LOW" });
    previousState.text = "BASS";
  } else if (character === "BASSS") {
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})',
    );
    targetEmit(id, {
      type: "cmd",
      payload: { cmd: "BASS", option: { property: "HIGH" } },
    });
    previousState.text = "BASSS";
  } else if (character === "ArrowDown") {
    charState.strings = "";
  } else if (character === "ArrowUp") {
    console.log("up arrow");
    console.log(previousState.text);
    charState.strings = previousState.text;
    stringEmit(charState.strings, false);
  } else if (character === " " && charState.strings === "") {
    metronomeBpmSet(id);
  } else if (character === "Shift") {
  } else if (character != undefined) {
    charState.strings = charState.strings + character;
    // if (!state.emoji) {
    stringEmit(charState.strings, false);
    // io.emit("stringsFromServer", { strings: strings, timeout: false });
    // } else {
    // stringEmit(io, emoji.random().emoji, false);
    // io.emit("stringsFromServer", { strings: strings, timeout: false });
    // }
  }
  console.log(charState.strings);
  return charState.strings;
}
