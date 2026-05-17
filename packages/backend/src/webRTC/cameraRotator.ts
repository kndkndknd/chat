// chat_sync 用のカメラ/マイク送信元を、接続中の全クライアントから
// 20 秒ごとに切り替えるローテータ。
//
// 受信側 (werift recv recorder → mediaChunkFromServer / audioChunkFromServer)
// は触らない。あくまで送信側 (ローカル webRTC ピアが chat_sync に流す
// MediaStream の元ネタ) を切り替えるだけ。
//
// 切替手順:
//   1) 現アクティブ ID に recorderSwitchStopFromServer を送り MediaRecorder 停止
//   2) ffmpeg サブプロセスを再起動 (新しい EBML header から再 probe させる)
//   3) 次のクライアントに bufferRecReqFromServer を送り MediaRecorder 起動
// 切替中は setActiveSourceClientId(null) でチャンク受信を遮断し、
// 旧 sender の flush 残チャンクが新 ffmpeg に流れ込まないようにする。

import { ioState } from "../state/states/ioState";
import { clientState } from "../state";
import { restartFfmpegSubprocess, setActiveSourceClientId } from "./weriftClient";

const ROTATION_INTERVAL_MS = 20_000;
// ffmpeg 再起動後、新クライアントの MediaRecorder が EBML を流し始めるまでの
// 短い猶予。ここで activeSourceClientId を切り替えて受信を再開する。
const ACTIVATE_DELAY_MS = 200;

let rotationTimer: NodeJS.Timeout | null = null;
let currentTargetId: string | null = null;
let rotating = false;

function listTargets(): string[] {
  return Object.keys(clientState.client);
}

function pickNext(current: string | null, list: string[]): string | null {
  if (list.length === 0) return null;
  if (current === null) return list[0];
  const idx = list.indexOf(current);
  if (idx < 0) return list[0];
  return list[(idx + 1) % list.length];
}

async function switchTo(nextId: string | null): Promise<void> {
  if (rotating) return;
  rotating = true;
  try {
    // 旧 sender を止める。受信側 MSE は壊さないので mediaResetFromServer は送らない。
    if (currentTargetId) {
      ioState?.io
        .to(currentTargetId)
        .emit("recorderSwitchStopFromServer");
      console.log(
        `[rotator] recorderSwitchStopFromServer -> ${currentTargetId}`,
      );
    }
    // 送信元 ID をクリアし、過渡期のチャンクを ffmpeg に通さない
    setActiveSourceClientId(null);
    currentTargetId = null;

    if (!nextId) {
      console.warn("[rotator] no next target; pipeline idle");
      return;
    }

    // ffmpeg を再起動 — 新クライアントの新規 EBML を probe させる
    await restartFfmpegSubprocess();

    // 新 sender に MediaRecorder 起動を指示してから少し待ち、入力受け入れを開始
    ioState?.io.to(nextId).emit("bufferRecReqFromServer");
    console.log(`[rotator] bufferRecReqFromServer -> ${nextId}`);
    await new Promise((r) => setTimeout(r, ACTIVATE_DELAY_MS));
    currentTargetId = nextId;
    setActiveSourceClientId(nextId);
  } finally {
    rotating = false;
  }
}

async function tick(): Promise<void> {
  const list = listTargets();
  // 対象が現在の sender 1 台しかいない場合はスキップ。
  // (再起動でわざわざ ~300ms 断続させても意味がないため。)
  if (list.length === 1 && list[0] === currentTargetId) {
    return;
  }
  const next = pickNext(currentTargetId, list);
  await switchTo(next);
}

export function startCameraRotation(): void {
  if (rotationTimer) {
    console.log("[rotator] already running");
    return;
  }
  // 初回起動 (ffmpeg は startWebRTCSession で既に起動済み)
  const first = pickNext(null, listTargets());
  if (!first) {
    console.warn("[rotator] no clients connected at start");
  } else {
    ioState?.io.to(first).emit("bufferRecReqFromServer");
    console.log(`[rotator] bufferRecReqFromServer -> ${first} (initial)`);
    currentTargetId = first;
    setActiveSourceClientId(first);
  }
  rotationTimer = setInterval(() => {
    void tick();
  }, ROTATION_INTERVAL_MS);
  console.log(`[rotator] started, interval=${ROTATION_INTERVAL_MS}ms`);
}

export function stopCameraRotation(): void {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }
  if (currentTargetId) {
    // STOPWEBRTC と整合させるため bufferRecStopFromServer を使用。
    // フロント側ハンドラで MSE もリセットされるが、stopWebRTCSession() 側で
    // mediaResetFromServer を全体配信するので意味的に重複するだけで害はない。
    ioState?.io.to(currentTargetId).emit("bufferRecStopFromServer");
    console.log(`[rotator] bufferRecStopFromServer -> ${currentTargetId}`);
  }
  setActiveSourceClientId(null);
  currentTargetId = null;
  console.log("[rotator] stopped");
}
