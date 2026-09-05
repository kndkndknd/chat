// import { millisecondsPerBar } from "../../util/bpmCalc";
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
export const quantizeCmd = (id?: string) => {
  const bpmStreamState = {};
  if (id === undefined) {
    for (const client in bpmState) {
      bpmStreamState[client] = {
        ...bpmState[client].stream,
      };
    }
  } else {
    bpmStreamState[id] = {
      ...(bpmState[id]?.stream ?? {}),
    };
  }
  const quntizeStreamObj = quantize({ splited: false });
  setBpmState(quntizeStreamObj);
  console.log("quntizeStreamObj", quntizeStreamObj);
  emitQuantize(quntizeStreamObj);
};
