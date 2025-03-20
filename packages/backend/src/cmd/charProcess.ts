import SocketIO from "socket.io";
import { previousState } from "../states";
import { receiveEnter } from "./receiveEnter";
import { stopEmit } from "./stopEmit";
import { metronomeBpmSet } from "./metronomeBpmSet";
import { stringEmit } from "../socket/ioEmit";
import { getLogCmd, resetCmdLogNum } from "../logging/getLogCmd";
import { cmdLogging } from "../logging/cmdLogging";
// import { get } from "http";

let cmdLogNum = 0;

export function charProcess(
  character: string,
  strings: string,
  id: string,
  io: SocketIO.Server
) {
  //console.log(character)
  if (character === "Enter") {
    receiveEnter(strings, id, io);
    resetCmdLogNum();
    strings = "";
  } else if (character === "ArrowUp" || character === "ArrowDown") {
    // if (character === "ArrowUp") {
    //   cmdLogNum++;
    // } else if (character === "ArrowDown" && cmdLogNum > 0) {
    //   cmdLogNum--;
    // }
    // strings = getLogCmd(cmdLogNum);
    strings = getLogCmd(character);
    stringEmit(io, strings, false);
  } else if (character === "Tab" || character === "ArrowRight") {
    io.emit("erasePrintFromServer", "");
    strings = "";
  } else if (character === "ArrowLeft" || character === "Backspace") {
    strings = strings.slice(0, -1);
    io.emit("stringsFromServer", { strings: strings, timeout: false });
  } else if (character === "Escape") {
    // const client: 'client' | 'sinewaveClient' = state.sinewaveMode ? "sinewaveClient" : "client";
    // console.log(client)
    cmdLogging("STOP");
    stopEmit(io, id, "ALL");
    strings = "";
  } else if (character === "BASS") {
    cmdLogging("BASS");
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})'
    );
    io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "LOW" });
    previousState.text = "BASS";
  } else if (character === "BASSS") {
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})'
    );
    io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "HIGH" });
    previousState.text = "BASSS";
  } else if (character === "ArrowDown") {
    strings = "";
  } else if (character === "ArrowUp") {
    console.log("up arrow");
    console.log(previousState.text);
    strings = previousState.text;
    io.emit("stringFromServer", { strings: strings, timeout: false });
  } else if (character === " " && strings === "") {
    metronomeBpmSet(io, id);
  } else if (character === "Shift") {
  } else if (character != undefined) {
    strings = strings + character;
    // if (!state.emoji) {
    stringEmit(io, strings, false);
    // io.emit("stringsFromServer", { strings: strings, timeout: false });
    // } else {
    // stringEmit(io, emoji.random().emoji, false);
    // io.emit("stringsFromServer", { strings: strings, timeout: false });
    // }
  }
  console.log(strings);
  return strings;
}
