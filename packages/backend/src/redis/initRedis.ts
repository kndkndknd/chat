import { redis } from "./client";
import { streamsRedis } from "./streamsRedis";
import {
  currentState,
  streamState,
  clientState,
  bpmState,
  bpmStateDefault,
} from "../state";
import { streamList } from "../data";

export const initRedis = async () => {
  // stream / chat のデータを削除
  const allStreamKeys = await streamsRedis.getAllKeys();
  for (const key of allStreamKeys) {
    await streamsRedis.clear(key);
    await streamsRedis.setIndex(key, 0);
  }
  await redis.del("chats");

  // currentState を初期化
  currentState.RECORD = false;
  currentState.WHOLE = false;
  currentState.sinewave = {};
  currentState.cmd.FEEDBACK = [];
  currentState.cmd.WHITENOISE = [];
  currentState.cmd.CLICK = [];
  currentState.cmd.BASS = [];
  currentState.cmd.METRONOME = [];
  for (const key of Object.keys(currentState.stream)) {
    currentState.stream[key] = false;
  }

  // streamState のターゲット / pa を初期化
  for (const key of Object.keys(streamState.target)) {
    streamState.target[key] = [];
  }
  for (const key of Object.keys(streamState.pa)) {
    streamState.pa[key] = false;
  }

  // 現在接続しているクライアントに初期値を与える
  const connectedIds = Object.keys(clientState.client);

  // cmdClient / streamClient を接続中の有効クライアントで再構築
  const activeIds = connectedIds.filter(
    (id) =>
      clientState.client[id].stream &&
      !clientState.client[id].urlPathName.includes("exc"),
  );
  clientState.cmdClient = [...activeIds];
  clientState.streamClient = [...activeIds];

  // bpmState を全接続クライアントに対して初期値で再設定
  for (const id of connectedIds) {
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

  console.log(
    `initRedis: streams cleared [${allStreamKeys.join(", ")}], active clients: ${activeIds.length}`,
  );
};
