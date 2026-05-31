// ナイトモード: 全端末の顔認識停止 + scenarioItsuki 停止 + timelapse バッファ収集停止
// + 全端末 BLACK モード + 全端末 masterGain=0 で消音。
// HTTP API (POST /api/nightmode {value:boolean}) から enable/disable する。
import { clientState } from "../state";
import { ioState } from "../state/states/ioState";
import { broadcastClientSettings } from "../clientSetting/clientSettingsEmit";
import { stopScenarioItsuki } from "../scenario/scenarioItsuki";

let nightModeActive = false;
// ナイトモード移行前の各クライアントの facedetection 設定を保持し、解除時に復元する。
let savedFaceDetection: { [id: string]: boolean } = {};

export const isNightModeActive = (): boolean => nightModeActive;

export const enableNightMode = (): void => {
  // 1. すべての端末で顔認識を停止する。
  //    元の設定を保存してから false にして配信し、フロント側で stopFaceDetection() させる。
  savedFaceDetection = {};
  Object.keys(clientState.client).forEach((id) => {
    savedFaceDetection[id] = clientState.client[id].facedetection;
    clientState.client[id].facedetection = false;
  });
  broadcastClientSettings();

  // 2. scenarioItsuki を停止する。
  stopScenarioItsuki();

  // 3. timelapse によるバッファ収集を停止する（フロントの timelapseState.flag を false に）。
  ioState.io?.emit("timelapseFromServer", { cmd: "FALSE" });

  // 4. すべての端末を BLACK モードにする。
  ioState.io?.emit("blackFromServer");

  // 5. すべての端末の masterGain を 0 にして消音する。
  ioState.io?.emit("masterMuteFromServer");

  nightModeActive = true;
  console.log("[nightMode] enabled");
};

// ナイトモード作動中に新しく接続してきた端末を、その端末だけナイトモードに合わせる。
// connectFromClient 直後（emitClientSettings の前）に呼ぶ想定。
// 顔認識を無効化し（解除時に元へ戻せるよう元の値を保存）、その端末を BLACK にする。
// 顔認識停止の通知自体は呼び出し側の emitClientSettings が facedetection:false を
// 送ることで行われる。
export const applyNightModeToClient = (id: string): void => {
  if (!nightModeActive) return;
  const c = clientState.client[id];
  if (!c) return;
  // 解除時に復元できるよう、この端末の元の facedetection 設定を保存しておく。
  if (savedFaceDetection[id] === undefined) {
    savedFaceDetection[id] = c.facedetection;
  }
  c.facedetection = false;
  // この端末の timelapse バッファ収集も止める。
  ioState.io?.to(id).emit("timelapseFromServer", { cmd: "FALSE" });
  ioState.io?.to(id).emit("blackFromServer");
  // この端末も消音する。
  ioState.io?.to(id).emit("masterMuteFromServer");
  console.log("[nightMode] applied to late-joining client", id);
};

export const disableNightMode = (): void => {
  // 顔認識を移行前の設定に復元する（元々 ON だった端末のみ再開する）。
  Object.keys(clientState.client).forEach((id) => {
    if (savedFaceDetection[id] !== undefined) {
      clientState.client[id].facedetection = savedFaceDetection[id];
    }
  });
  savedFaceDetection = {};
  broadcastClientSettings();

  // timelapse によるバッファ収集を再開する。
  ioState.io?.emit("timelapseFromServer", { cmd: "TRUE" });

  // BLACK モードを解除する。
  ioState.io?.emit("blackOffFromServer");

  // masterGain を移行前の値へ戻す。
  ioState.io?.emit("masterUnmuteFromServer");

  nightModeActive = false;
  console.log("[nightMode] disabled");
};
