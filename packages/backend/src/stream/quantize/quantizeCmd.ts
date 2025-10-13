import { millisecondsPerBar } from "../../../../util/bpmCalc";
// import { quantizeObjType } from "../../../../../types";
import { clientState, bpmState } from "../../state";
import { bpmClientStateType, bpmStreamStateType } from "../../../../../types";
import { decideQuantizeFromAverage } from "./decideQuantizeFromAverage";
import { streamList } from "../../data";
import { emitQuantize } from "./emitQuantize";
import { setBpmState } from "./setBpmState";
import { quantize } from "./quantize";

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
export const quantizeCmd = (io) => {
  const bpmStreamState = {};
  for (const client in bpmState) {
    bpmStreamState[client] = {
      ...bpmState[client].stream,
    };
  }
  const quntizeStreamObj = quantize({ splited: false });
  setBpmState(quntizeStreamObj);
  emitQuantize(quntizeStreamObj, io);
};
//   // io: SocketIO.Server,
//   target: {
//     streamTarget: string;
//     clientTarget: string;
//   },
//   parameter?: {
//     beat?: number;
//     bpm?: number;
//     flag?: boolean;
//   }
// ): { [client: string]: bpmStreamStateType } => {
//   // const argBpmClientObj = {};
//   // if (clientTarget === "all") {
//   //   for (const client of Object.keys(clientState.client)) {
//   //     argBpmClientObj[client] = {
//   //       stream: {},
//   //     };
//   //   }
//   // } else {
//   //   argBpmClientObj[clientTarget] = {
//   //     stream: {},
//   //   };
//   // }
//   // for (const client in argBpmClientObj) {
//   //   if (streamTarget === "all") {
//   //     argBpmClientObj[client].stream.CHAT = {};
//   //     for (const stream of streamList) {
//   //       argBpmClientObj[client][stream] = {};
//   //     }
//   //   } else {
//   //     argBpmClientObj[client].stream[streamTarget] = {};
//   //   }
//   // }
//   // const bpmClientObj: { [client: string]: bpmStreamStateType } =
//   //   decideQuantizeFromAverage(
//   //     argBpmClientObj,
//   //     parameter.beat,
//   //     parameter.bpm,
//   //     parameter.flag
//   //   );

//   const streamArr =
//     target.streamTarget !== "all"
//       ? [target.streamTarget]
//       : ["CHAT", ...streamList];
//   const clientArr =
//     target.clientTarget !== "all"
//       ? [target.clientTarget]
//       : Object.keys(clientState.client);

//   console.log("bpmState in test: ", bpmState);
//   // if (parameter === undefined) {
//   const preQuantizeObj: { [client: string]: bpmStreamStateType } = {};
//   for (const client of clientArr) {
//     preQuantizeObj[client] = {};
//     for (const stream of streamArr) {
//       preQuantizeObj[client][stream] =
//         bpmState[client].stream[stream] !== undefined
//           ? { ...bpmState[client].stream[stream] }
//           : {
//               bpm: 60,
//               beat: 4,
//               gridFlag: false,
//               quantizeFlag: false,
//               latency: 250,
//             };
//     }
//   }
//   console.log("preQuantizeObj: ", preQuantizeObj);
//   const quantizeObj = decideQuantizeFromAverage(preQuantizeObj, parameter);
//   console.log("quantizeObj: ", quantizeObj);
//   // console.log("quantizeState", quantizeState);
//   return quantizeObj;
//   // } else if (
//   //   parameter.beat !== undefined &&
//   //   parameter.bpm !== undefined &&
//   //   parameter.flag !== undefined
//   // ) {
//   //   const quantizeObj: { [client: string]: bpmStreamStateType } = {};

//   //   for (const client of clientArr) {
//   //     for (const stream of streamArr) {
//   //       quantizeObj[client].stream[stream] = {
//   //         bpm: parameter.bpm,
//   //         beat: parameter.beat,
//   //         gridFlag: false,
//   //         quantizeFlag: parameter.flag,
//   //         latency: 60000 / parameter.bpm / parameter.beat,
//   //       };
//   //     }
//   //   }
//   //   console.log("quantizeObj: ", quantizeObj);
//   //   return quantizeObj;
//   // }

//   // const quantizeObj = {
//   //   flag: flag,
//   //   stream: streamArr,
//   //   target: clientArr,
//   //   bpm: bpm,
//   //   bar: parameter.bpm !== undefined ? millisecondsPerBar(bpm) : bar,
//   //   beat: parameter.beat !== undefined ? parameter.beat : beat,
//   // };
// };
