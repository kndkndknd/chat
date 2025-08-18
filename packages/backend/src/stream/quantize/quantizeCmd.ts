import { millisecondsPerBar } from "../../../../util/bpmCalc";
// import { quantizeObjType } from "../../../../../types";
import { clientState, bpmState } from "../../state";
import { bpmClientStateType } from "../../../../../types";
import { decideQuantizeFromAverage } from "./decideQuantizeFromAverage";
import { streamList } from "../../data";

/**
 * クオンタイズコマンドに使用するクオンタイズ設定を決定する関数
 * @param streamTarget 対象とするストリーム名
 * @param clientTarget 対象とするクライアントID
 * @param parameter オプションのパラメータオブジェクト
 * @param parameter.beat ビート数（オプション）
 * @param parameter.bpm BPM（オプション）
 * @param parameter.flag フラグ（オプション）
 * @returns quantizeObjType オブジェクト
 * @description この関数は、指定されたストリームとクライアントに行うクオンタイズの設定内容のオブジェクトを返します。
 * parameterにbeat, bpm, flagを指定することで、クオンタイズの設定を変更できます。
 * もしparameterが指定されない場合、平均値を基にしたクオンタイズ設定が行われます。
 */
export const quantizeCmd = (
  // io: SocketIO.Server,
  streamTarget: string,
  clientTarget: string,
  parameter?: {
    beat?: number;
    bpm?: number;
    flag?: boolean;
  }
): { [client: string]: bpmClientStateType } => {
  const streamArr =
    streamTarget !== "all" ? [streamTarget] : ["CHAT", ...streamList];
  const clientArr =
    clientTarget !== "all" ? [clientTarget] : Object.keys(clientState.client);
  const { bpm, bar, beat, flag } = decideQuantizeFromAverage(
    streamArr,
    clientArr,
    parameter.beat,
    parameter.bpm,
    parameter.flag
  );
  console.log("quantizeCmd, debug", flag, bpm, bar, beat);
  const quantizeObj: { [client: string]: bpmClientStateType } = {};
  for (const client of clientArr) {
    quantizeObj[client] = {
      METRONOME: {
        flag: bpmState[client].METRONOME.flag,
        bpm: bpmState[client].METRONOME.bpm,
        beat: bpmState[client].METRONOME.beat,
      },
      MODULATION: {
        flag: bpmState[client].MODULATION.flag,
        bpm: bpmState[client].MODULATION.bpm,
        beat: bpmState[client].MODULATION.beat,
      },
      stream: {},
    };
    for (const stream of streamArr) {
      quantizeObj[client].stream[stream] = {
        quantizeFlag: flag,
        bpm: bpm,
        beat: beat,
        gridFlag: bpmState[client].stream[stream].gridFlag,
        latency: millisecondsPerBar(bpm) / beat,
      };
    }
  }

  // const quantizeObj = {
  //   flag: flag,
  //   stream: streamArr,
  //   target: clientArr,
  //   bpm: bpm,
  //   bar: parameter.bpm !== undefined ? millisecondsPerBar(bpm) : bar,
  //   beat: parameter.beat !== undefined ? parameter.beat : beat,
  // };
  console.log("quantizeObj", quantizeObj);
  // console.log("quantizeState", quantizeState);
  return quantizeObj;
};
