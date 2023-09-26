import SocketIO from "socket.io";
import { cmdStateType } from "../types/global";

import { receiveEnter } from "./receiveEnter";

import { stopEmit } from "./stopEmit";

import { metronomeBpmSet } from "./metronomeBpmSet";

export function charProcess(
  character: string,
  strings: string,
  id: string,
  io: SocketIO.Server,
  state: cmdStateType
) {
  //console.log(character)
  if (character === "Enter") {
    receiveEnter(strings, id, io, state);
    strings = "";
  } else if (
    character === "Tab" ||
    character === "ArrowRight" ||
    character === "ArrowDown"
  ) {
    io.emit("erasePrintFromServer", "");
    strings = "";
  } else if (character === "ArrowLeft" || character === "Backspace") {
    strings = strings.slice(0, -1);
    io.emit("stringsFromServer", { strings: strings, timeout: false });
  } else if (character === "Escape") {
    // const client: 'client' | 'sinewaveClient' = state.sinewaveMode ? "sinewaveClient" : "client";
    // console.log(client)
    stopEmit(io, state, 'ALL', 'all');
    strings = "";
  } else if (character === "BASS") {
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"LOW"})'
    );
    io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "LOW" });
    state.previous.text = "BASS";
  } else if (character === "BASSS") {
    console.log(
      "io.to(" + id + ').emit("cmdFromSever",{"cmd":"BASS","property":"HIGH"})'
    );
    io.to(id).emit("cmdFromServer", { cmd: "BASS", property: "HIGH" });
    state.previous.text = "BASSS";
  } else if (character === "ArrowDown") {
    strings = "";
  } else if (character === "ArrowUp") {
    console.log("up arrow");
    console.log(state.previous.text);
    strings = state.previous.text;
    io.emit("stringFromServer", { strings: strings, timeout: false });
  } else if (character === " " && strings === "") {
    metronomeBpmSet(io, state, id);
  } else if (character === "Shift") {
  } else if (character != undefined) {
    strings = strings + character;
    io.emit("stringsFromServer", { strings: strings, timeout: false });
  }
  console.log(strings);
  return strings;
}
