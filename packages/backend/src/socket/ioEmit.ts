import { ioState } from "../state/states/ioState";
import { cmdState } from "../state";
import { bpmStreamStateType } from "../../../../types";
import { videoBufferDataType } from "../media/videoBufferStore";

export const beatEmit = (option: any, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("beatFromServer", option);
  } else {
    ioState?.io.to(target).emit("beatFromServer", option);
  }
};

export const bpmEmit = (
  bpm: number,
  bar: number,
  target?: string
) => {
  if (target === undefined) {
    ioState?.io?.emit("bpmFromServer", { bpm: bpm, bar: bar });
  } else {
    ioState?.io?.to(target).emit("bpmFromServer", { bpm: bpm, bar: bar });
  }
};

export const chatEmit = (chunk, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("chatFromServer", chunk);
  } else {
    ioState?.io.to(target).emit("chatFromServer", chunk);
  }
};

export const chatReqEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("chatReqFromServer");
  } else {
    ioState?.io.to(target).emit("chatReqFromServer");
  }
}

export const clientSettingEmit = (payload: { facedetection: boolean; hanged: boolean }, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("clientSettingFromServer", payload);
  } else {
    ioState?.io.to(target).emit("clientSettingFromServer", payload);
  }
};

export const cmdEmit = (
  idArr: Array<string>,
  cmd: {
    cmd: string;
    value?: number;
    flag?: boolean;
    fade?: number;
    portament?: number;
    gain?: number;
    solo?: boolean;
  }
) => {
  console.log('idArr', idArr);
  idArr.forEach((id) => {
    ioState?.io.to(id).emit("cmdFromServer", cmd);
    // console.log(id);
    // if (
    //   clientState.client[id] !== undefined &&
    //   clientState.client[id].urlPathName.includes("pi") &&
    //   arduinoState.connected
    // ) {
    //   let timeout = cmd.cmd === "CLICK" || cmd.cmd === "STOP" ? 100 : 500;
    //   const result = switchOneshot(timeout);
    //   console.log("putCmd: switchOneshot", result);
    // }
  });
}

export const emitChangeBPM = (bpm: number, targetArr: string[], sourceArr: string[]) => {
  if(ioState?.io) {
    for (const target of targetArr) {
      ioState.io.to(target).emit("bpmFromServer", { bpm: bpm, source: sourceArr });
    }
  }
};

export const emojiEmit = (state: boolean, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("emojiFromServer", {
      state: state,
      text: "Emoji " + state,
    });
  } else {
    ioState?.io.to(target).emit("emojiFromServer", {
      state: state,
      text: "Emoji " + state,
    });
  }
};

export const erasePrintEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("erasePrintFromServer");
  } else {
    ioState?.io.to(target).emit("erasePrintFromServer");
  }
};

// TILEモード: 投影先クライアントにタイルの消去を通知する。
export const tileClearEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("tileClearFromServer");
  } else {
    ioState?.io.to(target).emit("tileClearFromServer");
  }
};

export const loopToggleEmit = (stream: string, target: string) => {
  if (target === undefined) {
    ioState?.io.emit("loopToggleFromServer", { stream, target });
  } else {
    ioState?.io.to(target).emit("loopToggleFromServer", { stream, target });
  }
}

// STOP 時の LOOP 解除。トグルではなく明示的な解除として送る。
export const loopClearEmit = (stream: string, target: string) => {
  ioState?.io.to(target).emit("loopClearFromServer", { stream, target });
}

export const mediaRecReqEmit = (data?: {container: string; mimeType: string; blob: ArrayBuffer }, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("mediaRecReqFromServer", data);
  } else {
    ioState?.io.to(target).emit("mediaRecReqFromServer", data);
  }
};

export const muteReqEmit = (flag: boolean, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("muteReqFromServer", { flag });
  } else {
    ioState?.io.to(target).emit("muteReqFromServer", { flag });
  }
};

// PLAYVIDEOBUFFER: バックエンドが保持した録画を対象クライアントへ送り返す。
// フロントは mediaRecFromServer 受信時に playRecording で再生する。
export const videoBufferEmit = (
  data: videoBufferDataType,
  target?: string,
) => {
  if (target === undefined) {
    ioState?.io.emit("mediaRecFromServer", data);
  } else {
    ioState?.io.to(target).emit("mediaRecFromServer", data);
  }
};

export const quantizeEmit = (
  quantizeObj: { [client: string]: bpmStreamStateType },
) => {
  console.log("emitQuantize", quantizeObj);
  for (const client in quantizeObj) {
    ioState?.io.to(client).emit("quantizeFromServer", quantizeObj[client]);
  }
};


export const recordReqEmit = (data: {source: string; timeout: number; index?: number; textPrint?: boolean}, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("recordReqFromServer", data);
  } else {
    ioState?.io.to(target).emit("recordReqFromServer", data);
  }
};

export const relayOfferEmit = (to: string, offer: RTCSessionDescriptionInit, fromId: string) => {
  ioState?.io.to(to).emit("relayOfferFromServer", { from: fromId, offer });
};

export const relayReceiverJoinedEmit = (receiverId: string, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("relayReceiverJoinedFromServer", { receiverId });
  } else {
    ioState?.io.to(target).emit("relayReceiverJoinedFromServer", { receiverId });
  }
};

export const relayRoomFullEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("relayRoomFullFromServer");
  } else {
    ioState?.io.to(target).emit("relayRoomFullFromServer");
  }
};


export const relayAnswerEmit = (
  to: string,
  answer: RTCSessionDescriptionInit,
  fromId: string
): void => {
  ioState?.io.to(to).emit("relayAnswerFromServer", { from: fromId, answer });
};

export const relayIceEmit = (
  to: string,
  candidate: RTCIceCandidateInit,
  fromId: string
): void => {
  ioState?.io.to(to).emit("relayIceFromServer", { from: fromId, candidate });
};

export const relaySenderGoneEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("relaySenderGoneFromServer");
  } else {
    ioState?.io.to(target).emit("relaySenderGoneFromServer");
  }
};

export const relayReceiverLeftEmit = (receiverId: string, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("relayReceiverLeftFromServer", { receiverId });
  } else {
    ioState?.io.to(target).emit("relayReceiverLeftFromServer", { receiverId });
  }
};

export const stopEmit = (data: {fadeOutVal: number, target: string, group?: string}) => {
  // console.log("stopEmit", data);
  if (data.target === "ALL") {
    ioState?.io.emit("stopFromServer", {
      fadeOutVal: data.fadeOutVal,
    });
  } else {
    ioState?.io.to(data.target).emit("stopFromServer", {
      fadeOutVal: data.fadeOutVal,
    });
  }
};

export const streamEmit = (stream: any, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("streamFromServer", stream);
  } else {
    ioState?.io.to(target).emit("streamFromServer", stream);
  }
};

export const stringEmit = (
  strings: string,
  timeout?: boolean,
  target?: string
) => {
  console.log('stringEmit', strings);
  if (timeout === undefined) timeout = true;
  if (target === undefined) {
    console.log("target is undefined", strings);
    ioState?.io.emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  } else {
    ioState?.io.to(target).emit("stringsFromServer", {
      strings: strings,
      timeout: timeout,
    });
  }
};

export const timelapseEmit = (cmd: string, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("timelapseFromServer", { cmd: cmd });
  } else {
    ioState?.io.to(target).emit("timelapseFromServer", { cmd: cmd });
  }
};

export const torchCmdEmit = (cmd: { flag: boolean; type: "STEADY" | "BLINK"; bpm: number }, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("torchCmdFromServer", cmd);
  } else {
    ioState?.io.to(target).emit("torchCmdFromServer", cmd);
  }
};

export const voskCallEmit = (target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("voskCallFromServer");
  } else {
    ioState?.io.to(target).emit("voskCallFromServer");
  }
};

export const wholeCmdEmit = (option: any, target?: string) => {
  if (target === undefined) {
    ioState?.io.emit("wholeCmdFromServer", option);
  } else {
    ioState?.io.to(target).emit("wholeCmdFromServer", option);
  }
};

// VOICE モードのクライアントに読み上げテキストを送る。
// target がクライアント ID の場合はその端末だけ、all/ALL/scenario/未指定は
// VOICE モードの全クライアントに送る。
export const voiceEmit = (text: string, target?: string) => {
  if (text === undefined || text.trim() === "") return;
  if (cmdState.VOICE.length === 0) return;

  const broadcast =
    target === undefined ||
    target === "all" ||
    target === "ALL" ||
    target === "scenario";
  const targets = broadcast
    ? cmdState.VOICE
    : cmdState.VOICE.filter((id) => id === target);

  targets.forEach((id) => {
    ioState?.io?.to(id)?.emit("voiceFromServer", {
      text,
      lang: cmdState.voiceLang,
    });
  });
};
