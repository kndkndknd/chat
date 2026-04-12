import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import { clientState, bpmState, bpmStateDefault, webSocketState } from "../state"
import { streamList } from "../data/list/streamList";
import { timelapseInterval } from "../stream/timelapse/timelapseInterval";

export const connectClient = (ip: string, ws: WebSocket, urlPathName: string = "") => {
  const clientId = randomUUID();
  const clientIdObj = { id: String(clientId), ws, ip: ip };
  console.log(clientIdObj);
  if(webSocketState.clientId.length === 0) {
    timelapseInterval(true);
  }
  webSocketState.clientId.push(clientIdObj);
  
  if(clientState.client[clientId] === undefined) {
    // IP重複を許容しない場合入れる。同じPCから複数出す場合があるのでいったん入れない
    // const ipList = Object.values(clientState.client).map(client => client.ipAddress);
    // if(ipList.includes(ip)) {
    //   console.log("IP address already exists in clientState:", ip);
    //   const existId = Object.keys(clientState.client).find(id => clientState.client[id].ipAddress === ip);
    //   delete clientState.client[existId!];
    // }
    clientState.client[clientId] = {
      ipAddress: ip,
      urlPathName: urlPathName,
      stream: true,
      projection: false,
      mobile: false,
      position: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
      self: false,
      snowLeopard: false,
    };
    clientState.cmdClient.push(clientId);
    clientState.streamClient.push(clientId);
    clientState.sinewaveClient.push(clientId);
  } else {
    if(clientState.client[clientId].ipAddress !== ip) {
      clientState.client[clientId].ipAddress = ip;
    }
  }
  // if(bpmState[clientId] === undefined) {
    bpmState[clientId] = {
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
      stream: {
        CHAT: {
          bpm: bpmStateDefault.bpm,
          beat: bpmStateDefault.beat,
          gridFlag: false,
          quantizeFlag: false,
          latency: 0,
        }
      }
    }
    streamList.forEach((stream) => {
      bpmState[clientId].stream[stream] = {
        bpm: bpmStateDefault.bpm,
        beat: bpmStateDefault.beat,
        gridFlag: false,
        quantizeFlag: false,
        latency: 0,
      }
    });
  // }
  ws.send(JSON.stringify({ type: "connect", payload: { id: clientId } }));
};
