
import { execCmd } from "./execCmd";
// import { voiceEmit } from "./voiceEmit";
import { execSinewave } from "./execSinewave";
import { previousCmd } from "./previousCmd";
import { m5Switch } from "../rotate/m5Access";
import { m5State } from "../rotate/m5State";

import { cmdList } from "../data";
import { clientState, bpmState, streamState, flagState } from "../state";
import { quantizeCmd } from "../stream/quantize";
import { stringEmit, emojiEmit, torchCmdEmit, voiceEmit } from "../socket/ioEmit";

import { parameterList } from "../data";
import { sinewaveChange } from "./sinewaveChange";
import { portamentChange } from "../parameterChange/portamentChange";
import { sampleRateChange } from "../parameterChange/sampleRateChange";
import { glitchChange } from "../parameterChange/glitchChange";
import { randomStreamOrder } from "../parameterChange/randomStreamOrder";
import { voiceChange } from "../parameterChange/voiceChange";
import { gridChange } from "../bpm/gridChange";



import { joinOrLeave, offerReq } from "../webRTC";

export const execEnter = async (
  strings: string,
  id: string
): Promise<void> => {
  if (Object.keys(cmdList).includes(strings)) {
    console.log("in cmd");
    voiceEmit(cmdList[strings], id);
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      execCmd(cmdList[strings], id);
    } else {
      execCmd(cmdList[strings]);
    }
  } else if (Object.keys(parameterList).includes(strings)) {
    const param = parameterList[strings]
    const arg = { source: id };
    switch (param) {
      case "PORTAMENT":
        portamentChange(arg);
        break;
      case "SAMPLERATE":
        sampleRateChange(arg);
        break;
      case "GLITCH":
        glitchChange(arg);
        break;
      case "GRID":
        gridChange(arg);
        break;
      case "RANDOM":
        randomStreamOrder();
        break;
      case "VOICE":
        voiceChange(arg);
        break;
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
  } else if (strings === "FUSEJI" || strings === "EMOJI") {
    flagState.emoji = !flagState.emoji;
    emojiEmit(flagState.emoji);
  } else if (strings === "NO" || strings === "NUMBER") {
    Object.keys(clientState.client).forEach((id) => {
      console.log(id);
      stringEmit(String(clientState.client[id].index), true, id);
    });
    // 20230923 sinewave Clientの表示
    clientState.sinewaveClient.forEach((id, index) => {
      console.log(id);
      stringEmit(String(index) + "(sinewave)", true, id);
      //putString(io, String(index), state)
    });
  } else if (strings === "PREVIOUS" || strings === "PREV") {
    voiceEmit("PREVIOUS", id);
    previousCmd();
  } else if (strings === "QUANTIZE") {
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      quantizeCmd(id);
    } else {
      quantizeCmd();
    }
  } else if (strings === "ROTATE") {
    const switchState = m5State.rotation.relay === "on" ? false : true;
    m5Switch("rotation", switchState);
    m5State.rotation.relay = switchState ? "on" : "off";
  } else if (strings === "SELF") {
    clientState.client[id].self = !clientState.client[id].self;
    console.log("SELF: ", clientState.client[id].self);
    stringEmit("SELF " + clientState.client[id].self, true, id);
  } else if (strings === "SINEWAVE") {
    const frequency = 20 + Math.random() * 19980;
    voiceEmit(frequency + "Hz", id);
    execSinewave(frequency);
    if (id !== "all" && clientState.client[id] !== undefined && clientState.client[id].self) {
      execSinewave(frequency, id);
    } else {
      execSinewave(frequency);
    }
  } else if (Number.isFinite(Number(strings))) {
    console.log("sinewave");
    voiceEmit(strings + "Hz", id);
    // if (clientState.client[id].self) {
    //   sinewaveEmit(Number(strings), io, id);
    // } else {
    execSinewave(Number(strings));
    // }
  } else if (strings === "SOLFEGGIO") {
    const solfeggioArr = [285, 396, 417, 528, 639, 741, 852, 963];
    const frequency =
      solfeggioArr[Math.floor(Math.random() * solfeggioArr.length)];
    if (clientState.client[id] !== undefined && clientState.client[id].self) {
      execSinewave(frequency);
    } else {
      execSinewave(frequency);
    }
  } else if (strings === "SWITCH") {
    const switchState = m5State.vibration.relay === "on" ? false : true;
    m5Switch("vibration", switchState);
    m5State.vibration.relay = switchState ? "on" : "off";
    // console.log(switchState);
    // ioState?.io.emit("stringsFromServer", {
    //   strings: "SWITCH " + switchState,
    //   timeout: true,
    // });
    // switchCtrl().then((result) => {
    //   console.log(result);
    // });
  } else if (strings === "TORCH" || strings === "BLINK") {
    // torch command
    if (bpmState[id] === undefined) {
      console.log("TORCH CMD skipped: no bpmState for", id);
      return;
    }
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
      bpm: bpmState[id].bpm,
    };
    bpmState[id].TORCH.flag = torchCommand.flag;
    bpmState[id].TORCH.type = torchCommand.type;
    torchCmdEmit(torchCommand, id);
    // ioState?.io.emit("torchCmdFromServer", torchCommand);
    console.log("TORCH CMD:", torchCommand, "to", id);
  } else if (strings === "TWICE" || strings === "HALF") {
    sinewaveChange(strings);
  }
  
};
