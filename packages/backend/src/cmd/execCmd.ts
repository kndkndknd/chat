import { ioState } from "../state/states/ioState";
import { cmdEmit } from "./cmdEmit";
import { voiceEmit } from "./voiceEmit";
import { sinewaveEmit } from "./sinewaveEmit";
import { previousCmd } from "./previousCmd";
import { switchCtrl } from "../arduinoAccess/arduinoAccess";
import { millisecondsPerBeat } from "../util/bpmCalc";

import { cmdList } from "../data";
import { clientState, arduinoState, bpmState, streamState } from "../state";
import { quantizeCmd } from "../stream/quantize";
import { stringEmit } from "../socket/ioEmit";
import { joinOrLeave, offerReq } from "../webRTC";

export const execCmd = async (
  strings: string,
  id: string
): Promise<void> => {
  if (Object.keys(cmdList).includes(strings)) {
    console.log("in cmd");
    voiceEmit(cmdList[strings], id);
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      cmdEmit(cmdList[strings], id);
    } else {
      cmdEmit(cmdList[strings]);
    }
  } else if (strings === "FILTER") {
    for (const stream in streamState.filter) {
      streamState.filter[stream].flag = !streamState.filter[stream].flag;
    }
    console.log(streamState.filter);
    stringEmit("FILTER: TOGGLED", true);
    // webRTC
  // } else if (strings === "JOIN" || strings === "LEAVE") {
  //   joinOrLeave(strings as "JOIN" | "LEAVE", io, id);
  // } else if (strings === "OFFER") {
  //   offerReq(io, id);
  } else if (strings === "PREVIOUS" || strings === "PREV") {
    voiceEmit("PREVIOUS", id);
    previousCmd();
  } else if (strings === "QUANTIZE") {
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      quantizeCmd(id);
    } else {
      quantizeCmd();
    }
  } else if (strings === "NO" || strings === "NUMBER") {
    Object.keys(clientState.client).forEach((id) => {
      console.log(id);
      ioState?.io.to(id).emit("stringsFromServer", {
        strings: String(clientState.client[id].index),
        timeout: true,
      });
      //putString(io, String(index), state)
    });
    // 20230923 sinewave Clientの表示
    clientState.sinewaveClient.forEach((id, index) => {
      console.log(id);
      ioState?.io.to(id).emit("stringsFromServer", {
        strings: String(index) + "(sinewave)",
        timeout: true,
      });
      //putString(io, String(index), state)
    });
  } else if (strings === "SELF") {
    clientState.client[id].self = !clientState.client[id].self;
    console.log("SELF: ", clientState.client[id].self);
    ioState?.io.to(id).emit("stringsFromServer", {
      strings: "SELF " + clientState.client[id].self,
      timeout: true,
    });
  } else if (strings === "SINEWAVE") {
    const frequency = 20 + Math.random() * 19980;
    voiceEmit(frequency + "Hz", id);
    sinewaveEmit(frequency);
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      sinewaveEmit(frequency, id);
    } else {
      sinewaveEmit(frequency);
    }
  } else if (Number.isFinite(Number(strings))) {
    console.log("sinewave");
    voiceEmit(strings + "Hz", id);
    // if (clientState.client[id].self) {
    //   sinewaveEmit(Number(strings), io, id);
    // } else {
    sinewaveEmit(Number(strings));
    // }
  } else if (strings === "SOLFEGGIO") {
    const solfeggioArr = [285, 396, 417, 528, 639, 741, 852, 963];
    const frequency =
      solfeggioArr[Math.floor(Math.random() * solfeggioArr.length)];
    if (clientState.client[id] !== undefined && clientState.client[id].self) {
      sinewaveEmit(frequency);
    } else {
      sinewaveEmit(frequency);
    }
  } else if (strings === "SWITCH") {
    const switchState = arduinoState.relay === "on" ? "OFF" : "ON";
    console.log(switchState);
    ioState?.io.emit("stringsFromServer", {
      strings: "SWITCH " + switchState,
      timeout: true,
    });
    switchCtrl().then((result) => {
      console.log(result);
    });
  } else if (strings === "TORCH" || strings === "BLINK") {
    // torch command
    const flag =
      (strings === "TORCH" &&
        (!bpmState[id].TORCH.flag || bpmState[id].TORCH.type === "BLINK")) ||
      (strings === "BLINK" &&
        (!bpmState[id].TORCH.flag || bpmState[id].TORCH.type === "STEADY"))
        ? true
        : false;
    const torchCommand = {
      flag: flag,
      type: <"STEADY" | "BLINK">(strings === "TORCH" ? "STEADY" : "BLINK"),
      bpm: bpmState[id]
        ? bpmState[id].TORCH.bpm
        : bpmState[Object.keys(bpmState)[0]].METRONOME.bpm,
    };
    bpmState[id].TORCH.flag = torchCommand.flag;
    bpmState[id].TORCH.type = torchCommand.type;
    ioState?.io.emit("torchCmdFromServer", torchCommand);
    console.log("TORCH CMD:", torchCommand, "to", id);
  }
};
