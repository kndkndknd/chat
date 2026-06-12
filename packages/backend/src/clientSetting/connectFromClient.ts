// import { cmdSelect } from "../route";
import {
  clientState,
  streamState,
  arduinoState,
  bpmState,
  bpmStateDefault,
  cmdState,
} from "../state";
import { streamList } from "../data";
import { floatingPosition } from "./floatingPosition";

const currentIndices = (): number[] =>
  Object.keys(clientState.client).map((id) => clientState.client[id].index);

// 0 から順に未使用の最小 index を返す
const smallestUnusedIndex = (): number => {
  const used = new Set(currentIndices());
  let i = 0;
  while (used.has(i)) i++;
  return i;
};

// 衝突した既存クライアントを末尾へ退避させる際の index（現在の最大 + 1）
const evictedIndex = (): number => {
  const indices = currentIndices();
  return indices.length === 0 ? 0 : Math.max(...indices) + 1;
};

export const connectFromClient = (data, id: string, ipAddress: string) => {
  if(data.urlPathName === "/nosound"){
    console.log("nosound client connected");
    return;
  }

  // 20260530-0610 クライアントのURLパスに応じた初期設定
  if(data.urlPathName === "/1" || data.urlPathName === "/2" || data.urlPathName === "/3"){
    // 1: Macbook Pro, facedetection client(20260530-0610)
    const desiredIndex = Number(data.urlPathName.slice(-1));
    // 既に同じ index を持つクライアントがいれば末尾へ退避
    Object.keys(clientState.client).forEach((existingId) => {
      if (clientState.client[existingId].index === desiredIndex) {
        clientState.client[existingId].index = evictedIndex();
      }
    });

    // /1, /2 のルーティングで顔認証(facedetection)を有効化していたが、その動作をコメントアウト。
    // 顔認証機能自体(faceDetectScenario など)は残しつつ、このルーティングからは有効化しない。
    // const facedetection = data.urlPathName === "/1" || data.urlPathName === "/2";
    const facedetection = false;
    const hanged = data.urlPathName === "/3";

    clientState.client[id] = {
      ipAddress,
      stream: true,
      urlPathName: data.urlPathName,
      projection: false,
      mobile: data.isMobile,
      position: {
        top: 0,
        left: 0,
        width: data.width,
        height: data.height,
      },
      self: false,
      snowLeopard: false,
      index: desiredIndex,
      facedetection: facedetection,
      hanged: hanged,
    };

    if (!streamState.timelapse) streamState.timelapse = true;

    clientState.cmdClient.push(id);
    clientState.streamClient.push(id);

    if (bpmState[id] === undefined) {
      bpmState[id] = {
        METRONOME: {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          flag: bpmStateDefault.metronomeFlag,
        },
        MODULATION: {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          flag: bpmStateDefault.modulationFlag,
        },
        TORCH: {
          bpm: bpmStateDefault.bpm,
          flag: bpmStateDefault.torchBlinkFlag,
          type: bpmStateDefault.torchType,
        },
        stream: {},
      };
      ["CHAT", ...streamList].forEach((stream) => {
        bpmState[id].stream[stream] = {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          gridFlag: bpmStateDefault.gridFlag,
          quantizeFlag: bpmStateDefault.quantizeFlag,
          latency: bpmStateDefault.latency,
        };
      });
    }
    return true;
  }

  let sockId = id;
  console.log("ipAddress: " + ipAddress);
  console.log("urlPathName", data.urlPathName);
  if (data.urlPathName.includes("pi")) {
    console.log("aruidino host is " + ipAddress);
    arduinoState.host = ipAddress;
  }
  const snowLeopard = data.urlPathName.includes("snowleopard") ? true : false;
  if (data.clientMode === "client") {
    console.log(
      "connectFromClient data:" +
        data +
        ", id:" +
        sockId
    );

    if (!streamState.timelapse) streamState.timelapse = true;

    if (!Object.keys(clientState.client).includes(sockId)) {
      const index = smallestUnusedIndex();
      if (data.urlPathName.includes("project")) {
        clientState.client[sockId] = {
          ipAddress,
          stream: true,
          urlPathName: data.urlPathName,
          projection: true,
          mobile: data.isMobile,
          position: {
            top: 0,
            left: 0,
            width: data.width,
            height: data.height,
          },
          self: false,
          snowLeopard,
          index,
          facedetection: data.urlPathName.includes("face") ? true : false,
          hanged: data.urlPathName.includes("hanged") ? true : false,
        };
      } else {
        // const floatingPosition = {
        //   top: 0,
        //   left: 0,
        //   width: data.width,
        //   height: data.height,
        // };
        const position = floatingPosition(sockId);

        clientState.client[sockId] = {
          ipAddress,
          stream: true,
          urlPathName: data.urlPathName,
          projection: false,
          position,
          mobile: data.isMobile,
          self: false,
          snowLeopard,
          index,
          facedetection: data.urlPathName.includes("face") ? true : false,
          hanged: data.urlPathName.includes("hanged") ? true : false,
        };
      }
    }
    if (!data.urlPathName.includes("exc")) {
      if (!Object.keys(clientState.cmdClient).includes(sockId)) {
        clientState.cmdClient.push(sockId);
      }
      if (!Object.keys(clientState.streamClient).includes(sockId)) {
        clientState.streamClient.push(sockId);
      }
    }

    if (bpmState[sockId] === undefined) {
      bpmState[sockId] = {
        METRONOME: {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          flag: bpmStateDefault.metronomeFlag,
        },
        MODULATION: {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          flag: bpmStateDefault.modulationFlag,
        },
        TORCH: {
          bpm: bpmStateDefault.bpm,
          flag: bpmStateDefault.torchBlinkFlag,
          type: bpmStateDefault.torchType,
        },
        stream: {},
      };
      ["CHAT", ...streamList].forEach((stream) => {
        bpmState[sockId].stream[stream] = {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          gridFlag: bpmStateDefault.gridFlag,
          quantizeFlag: bpmStateDefault.quantizeFlag,
          latency: bpmStateDefault.latency,
        };
      });
    }

    // console.log("bpmState", sockId, bpmState[sockId]);

    // console.log(clientState.client);
    return true;
    // } else if (data.clientMode === "sinewaveClient") {
    //   console.log(sockId + " is sinewaveClient");
    //   if (!states.sinewaveClient.includes(sockId))
    //     states.sinewaveClient.push(sockId);
    //   states.sinewaveClient = states.sinewaveClient.filter((id) => {
    //     //console.log(io.sockets.adapter.rooms.has(id))
    //     if (io.sockets.adapter.rooms.has(id)) {
    //       return id;
    //     }
    //   });
  } else if (data.clientMode === "noStream") {
    // METRONOMEは接続時に初期値を作る
    // cmdState.METRONOME[sockId] = 1000;
    if (bpmState[sockId] === undefined) {
      bpmState[sockId] = {
        stream: {},
        METRONOME: { bpm: 60, beat: 4, flag: false },
        MODULATION: { bpm: 60, beat: 4, flag: false },
        TORCH: { bpm: 60, flag: false, type: "STEADY" },
      };
    }
    console.log(sockId + " is noStream Client");
    const position = floatingPosition(sockId);

    clientState.client[sockId] = {
      ipAddress,
      stream: false,
      urlPathName: data.urlPathName,
      projection: false,
      position,
      mobile: data.isMobile,
      self: false,
      snowLeopard,
      index: smallestUnusedIndex(),
      facedetection: false,
      hanged: false,
    };
    return true;
  } else if (data.clientMode === "arduinoClient") {
    console.log(sockId + " is arduinoClient");
    clientState.arduinoClient[sockId] = true;
    return true;
  }
};
