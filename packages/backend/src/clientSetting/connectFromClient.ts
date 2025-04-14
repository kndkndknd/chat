// import { cmdSelect } from "../route";
import {
  clientState,
  streamState,
  arduinoState,
  bpmState,
  cmdState,
} from "../state";
import { quantizeState } from "../state";
import { floatingPosition } from "./floatingPosition";

export const connectFromClient = (data, socket, io) => {
  let sockId = String(socket.id);
  const ipAddress = socket.handshake.address.split(":")[3];
  console.log("ipAddress: " + ipAddress);
  console.log("urlPathName", data.urlPathName);
  if (data.urlPathName.includes("pi")) {
    console.log("aruidino host is " + ipAddress);
    arduinoState.host = ipAddress;
  }
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
          position: {
            top: 0,
            left: 0,
            width: data.width,
            height: data.height,
          },
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

    if (!Object.keys(bpmState.client).includes(sockId)) {
      bpmState.client[sockId] = 60;
    }

    // METRONOMEは接続時に初期値を作る
    cmdState.METRONOME[sockId] = 1000;

    // QUANTIZE
    for (const stream of Object.keys(quantizeState)) {
      if (quantizeState[stream][sockId] === undefined) {
        quantizeState[stream][sockId] = {
          bpm: 60,
          beat: 0,
          flag: false,
        };
      }
    }

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
    cmdState.METRONOME[sockId] = 1000;
    console.log(sockId + " is noStream Client");
    const position = floatingPosition(sockId);

    clientState.client[sockId] = {
      ipAddress,
      stream: false,
      urlPathName: data.urlPathName,
      projection: false,
      position,
    };
    return true;
  }
};
