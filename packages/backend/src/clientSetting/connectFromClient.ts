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

export const connectFromClient = (data, socket) => {
  if(data.urlPathName === "/nosound"){
    console.log("nosound client connected");
    return;
  }
  let sockId = String(socket.id);
  const ipAddress = socket.handshake.address.split(":")[3];
  console.log("ipAddress: " + ipAddress);
  console.log("urlPathName", data.urlPathName);
  if (data.urlPathName.includes("pi")) {
    console.log("aruidino host is " + ipAddress);
    arduinoState.host = ipAddress;
  }
  const snowLeopard = data.urlPathName.includes("snowleopard") ? true : false;
  if (data.clientMode === "client") {
    if (!streamState.timelapse) streamState.timelapse = true;
    console.log(
      'socket.on("connectFromClient", (data) => {data:' +
        data +
        ", id:" +
        sockId +
        "}"
    );
    if (!Object.keys(clientState.client).includes(sockId))
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
        };
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

    console.log("bpmState", sockId, bpmState[sockId]);

    console.log(clientState.client);
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
    };
    return true;
  }
};
