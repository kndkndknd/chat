import SocketIO from "socket.io";
import { cmdEmit } from "./cmdEmit";
import { voiceEmit } from "./voiceEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { previousCmd } from "./previousCmd";
import { switchCtrl } from "../arduinoAccess/arduinoAccess";
import { millisecondsPerBeat } from "../../../util/bpmCalc";

import { cmdList } from "../data";
import { clientState, arduinoState, bpmState, streamState } from "../state";
import { quantizeCmd } from "../stream/quantize";
import { stringEmit } from "../socket/ioEmit";
import { joinOrLeave, offerReq } from "../webRTC";

export const execCmd = async (
  strings: string,
  io: SocketIO.Server,
  id: string
): Promise<void> => {
  if (Object.keys(cmdList).includes(strings)) {
    console.log("in cmd");
    voiceEmit(io, cmdList[strings], id);
    if (clientState.client[id].self) {
      cmdEmit(cmdList[strings], io, id);
    } else {
      cmdEmit(cmdList[strings], io);
    }
  } else if (strings === "CLOCK") {
    /*
    state.clockMode = !state.clockMode;
    console.log(state.clockMode);
    io.to(id).emit("clockModeFromServer", { clockMode: state.clockMode });
    */
    io.emit("clockFromServer", {
      clock: true,
      // 暫定
      barLatency:
        millisecondsPerBeat(bpmState[Object.keys(bpmState)[0]].METRONOME.bpm) *
        4,
    });
  } else if (strings === "FILTER") {
    for (const stream in streamState.filter) {
      streamState.filter[stream].flag = !streamState.filter[stream].flag;
    }
    console.log(streamState.filter);
    stringEmit(io, "FILTER: TOGGLED", true);
    // webRTC
  } else if (strings === "JOIN" || strings === "LEAVE") {
    joinOrLeave(strings as "JOIN" | "LEAVE", io, id);
  } else if (strings === "OFFER") {
    offerReq(io, id);
  } else if (strings === "PREVIOUS" || strings === "PREV") {
    voiceEmit(io, "PREVIOUS", id);
    previousCmd(io);
  } else if (strings === "QUANTIZE") {
    if (clientState.client[id].self) {
      quantizeCmd(io, id);
    } else {
      quantizeCmd(io);
    }
  } else if (strings === "NO" || strings === "NUMBER") {
    Object.keys(clientState.client).forEach((id, index) => {
      console.log(id);
      io.to(id).emit("stringsFromServer", {
        strings: String(index),
        timeout: true,
      });
      //putString(io, String(index), state)
    });
    // 20230923 sinewave Clientの表示
    clientState.sinewaveClient.forEach((id, index) => {
      console.log(id);
      io.to(id).emit("stringsFromServer", {
        strings: String(index) + "(sinewave)",
        timeout: true,
      });
      //putString(io, String(index), state)
    });
  } else if (strings === "SINEWAVE") {
    const frequency = 20 + Math.random() * 19980;
    voiceEmit(io, frequency + "Hz", id);
    sinewaveEmit(frequency, io);
    if (clientState.client[id].self) {
      sinewaveEmit(frequency, io, id);
    } else {
      sinewaveEmit(frequency, io);
    }
  } else if (Number.isFinite(Number(strings))) {
    console.log("sinewave");
    voiceEmit(io, strings + "Hz", id);
    if (clientState.client[id].self) {
      sinewaveEmit(Number(strings), io, id);
    } else {
      sinewaveEmit(Number(strings), io);
    }
  } else if (strings === "SWITCH") {
    const switchState = arduinoState.relay === "on" ? "OFF" : "ON";
    console.log(switchState);
    io.emit("stringsFromServer", {
      strings: "SWITCH " + switchState,
      timeout: true,
    });
    switchCtrl().then((result) => {
      console.log(result);
    });
  } else if (strings === "SOLFEGGIO") {
    const solfeggioArr = [285, 396, 417, 528, 639, 741, 852, 963];
    const frequency =
      solfeggioArr[Math.floor(Math.random() * solfeggioArr.length)];
    if (clientState.client[id].self) {
      sinewaveEmit(frequency, io, id);
    } else {
      sinewaveEmit(frequency, io);
    }
  } else if (strings === "SELF") {
    clientState.client[id].self = !clientState.client[id].self;
    console.log("SELF: ", clientState.client[id].self);
    io.to(id).emit("stringsFromServer", {
      strings: "SELF " + clientState.client[id].self,
      timeout: true,
    });
  }
};
