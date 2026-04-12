import { buffStateType } from "./streamType";
import { bpmStreamStateType } from "./bpmType";

export type webSocketType = initSocketType | stringSocketType | cmdSocketType | streamReqSocketType | streamSocketType | paramsSocketType | stopSocketType | webRTCType;

export type initSocketType = {
  type: "connect";
  payload: {
    id: string;
  };
}

export type stringSocketType = {
  type: "string";
  payload: {
    string: string;
    timeout: boolean;
  };
}

export type stopSocketType = {
  type: "stop";
  payload: {
    target: string;
    fadeOutVal: number;
  };
}

export type cmdSocketType = {
  type: "cmd";
  payload: {
    cmd: string;
    option?: {
      property: string;
      value?: number;
      flag?: boolean;
      fade?: number;
      portament?: number;
      gain?: number;
      solo?: boolean;
    };
  };
}

export type streamSocketType = {
  type: "stream";
  payload: buffStateType;
}

export type streamReqSocketType = {
  type: "streamReq";
  payload: {
    source: string;
    record?: boolean;
    timeout?: number;
    cmd?: "startReq" | "stopReq" | "get";
  };
}

export type paramsSocketType = {
  type: "params";
  payload: {
    type: "bpm";
    bpm: number;
    bar: number;
  } | {
    type: "quantize";
    param: bpmStreamStateType;
  } | {
    type: "emoji";
    state: boolean;
    text?: string;
  } | {
    type: "vosk";
    param: "call" | "stop";
  }
}

export type webRTCType = {
  type: "webrtc";
  payload: {
    type: "offerReq" | "offerRes" | "iceCandidate";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
  };
}
