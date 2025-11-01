import SocketIO from "socket.io";
import { cmdEmit } from "./cmdEmit";
import { voiceEmit } from "./voiceEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { previousCmd } from "./previousCmd";
import { switchCtrl } from "../arduinoAccess/arduinoAccess";
import { millisecondsPerBeat } from "../../../util/bpmCalc";

import { cmdList } from "../data";
import { clientState, arduinoState, bpmState, flagState } from "../state";

export const execCmd = async (
  strings: string,
  io: SocketIO.Server,
  id: string
): Promise<void> => {
  if (Object.keys(cmdList).includes(strings)) {
    console.log("in cmd");
    voiceEmit(io, cmdList[strings], id);
    cmdEmit(cmdList[strings], io);
  } else if (Number.isFinite(Number(strings))) {
    console.log("sinewave");
    voiceEmit(io, strings + "Hz", id);
    sinewaveEmit(Number(strings), io);
  } else if (strings === "SINEWAVE") {
    const frequency = 20 + Math.random() * 19980;
    voiceEmit(io, frequency + "Hz", id);
    sinewaveEmit(frequency, io);
  } else if (strings === "PREVIOUS" || strings === "PREV") {
    voiceEmit(io, "PREVIOUS", id);
    previousCmd(io);
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
  } else if (strings === "SOLFEGGIO") {
    const solfeggioArr = [285, 396, 417, 528, 639, 741, 852, 963];
    const frequency =
      solfeggioArr[Math.floor(Math.random() * solfeggioArr.length)];
    sinewaveEmit(frequency, io);
  } else if (strings === "VIDEO") {
    flagState.video = !flagState.video;
    console.log("flagState.video:", flagState.video);
    io.emit("videoRequestFromServer", { video: flagState.video });
  }
};
