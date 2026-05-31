// chat_sync 用のカメラ/マイク送信元を、urlPathName に "pi" を含む
// クライアント (Raspberry Pi / "/pi") に固定するセレクタ。
// 以前は 20 秒ごとに全クライアントを巡回していたが、現在はローテーション
// せず "/pi" に一度だけ切り替える。
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
import {
  getActiveChunkCount,
  isWebRtcSessionActive,
  restartFfmpegSubprocess,
  setActiveSourceClientId,
  setOnPeerConnected,
  startWebRTCSession,
} from "./weriftClient";

// "/pi" クライアントが起動時にまだ接続していない場合に再探索する間隔。
const PI_POLL_INTERVAL_MS = 2_000;
// ffmpeg 再起動後、新クライアントの MediaRecorder が EBML を流し始めるまでの
// 短い猶予。ここで activeSourceClientId を切り替えて受信を再開する。
const ACTIVATE_DELAY_MS = 200;
// bufferRecReqFromServer を再送する間隔と最大回数。
// 切替直後にクライアントの streamState.stream がまだ未準備だと初回の録画開始
// 指示を取りこぼすため、チャンクが流れ始めるまで定期的に送り直す。
const REC_REQ_RETRY_INTERVAL_MS = 1_500;
const REC_REQ_RETRY_MAX = 20;

let piPollTimer: NodeJS.Timeout | null = null;
let recReqRetryTimer: NodeJS.Timeout | null = null;
let currentTargetId: string | null = null;
let rotating = false;

// urlPathName に "pi" を含むクライアント ID を返す。未接続なら null。
function findPiTarget(): string | null {
  for (const id of Object.keys(clientState.client)) {
    if (clientState.client[id]?.urlPathName?.includes("pi")) {
      return id;
    }
  }
  return null;
}

// 対象クライアントが実際にチャンクを流し始めるまで bufferRecReqFromServer を
// 再送する。ensureWebRtcFromClient → bufferRecReqFromServer が initialize 完了前
// (streamState.stream 準備前) に届くと初回指示を取りこぼすため、その競合を
// リカバリする。チャンク受信を確認したら停止する。
function startRecReqRetry(targetId: string): void {
  stopRecReqRetry();
  let attempts = 0;
  recReqRetryTimer = setInterval(() => {
    // 対象が切り替わった / 停止した場合は中断
    if (currentTargetId !== targetId) {
      stopRecReqRetry();
      return;
    }
    // チャンクが流れ始めていれば成功。再送を止める。
    if (getActiveChunkCount() > 0) {
      console.log(`[rotator] ${targetId} now streaming; stop rec-req retry`);
      stopRecReqRetry();
      return;
    }
    attempts++;
    if (attempts > REC_REQ_RETRY_MAX) {
      console.warn(
        `[rotator] ${targetId} never started after ${attempts} retries; giving up`,
      );
      stopRecReqRetry();
      return;
    }
    ioState?.io.to(targetId).emit("bufferRecReqFromServer");
    console.log(
      `[rotator] bufferRecReqFromServer resend #${attempts} -> ${targetId}`,
    );
  }, REC_REQ_RETRY_INTERVAL_MS);
}

function stopRecReqRetry(): void {
  if (recReqRetryTimer) {
    clearInterval(recReqRetryTimer);
    recReqRetryTimer = null;
  }
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

// 新しいピアが接続したときに送信元 (/pi) の MediaRecorder を再起動し、
// 新規 EBML + keyframe を流し直す。後から参加したピアが mid-stream な VP8 を
// 受け取って黒画面になるのを防ぐ (werift は copy 中継で keyframe を生成できない)。
function refreshCurrentSource(): void {
  if (!currentTargetId) return;
  const target = currentTargetId;
  console.log(`[rotator] refresh source for new peer -> ${target}`);
  void switchTo(target).then(() => startRecReqRetry(target));
}

export function startCameraRotation(): void {
  if (currentTargetId || piPollTimer) {
    console.log("[rotator] already running");
    return;
  }
  // 【無効化】接続時に refreshCurrentSource で ffmpeg + 送信元 MediaRecorder を
  // 再起動して keyframe を作り直すフックは、送信元ブラウザのキーフレーム供給
  // タイミングに依存して壊れる (Windows /pi で再起動後 video が数秒出ない回帰)。
  // ffmpeg を libvpx 再エンコード + -g 30 (定期 keyframe) に変更したことで、遅参
  // ピアも ~1.5秒で必ず keyframe を得られるため、このフックは不要になった。
  // refreshCurrentSource() は将来の参照用に残置するが登録しない。
  setOnPeerConnected(null);
  // 送信元を "/pi" クライアントに固定する。一度切り替えたら巡回しない。
  const pi = findPiTarget();
  if (pi) {
    // 切替完了後、対象が実際に録画を始めるまで rec-req を再送する。
    void switchTo(pi).then(() => startRecReqRetry(pi));
    console.log(`[rotator] fixed source -> ${pi} (/pi)`);
    return;
  }
  // "/pi" がまだ未接続。接続されるまで短い間隔で探索し、見つかり次第
  // 一度だけ切り替えて探索を止める。
  console.warn("[rotator] no /pi client yet; polling until connected");
  piPollTimer = setInterval(() => {
    const found = findPiTarget();
    if (!found) return;
    if (piPollTimer) {
      clearInterval(piPollTimer);
      piPollTimer = null;
    }
    void switchTo(found).then(() => startRecReqRetry(found));
    console.log(`[rotator] fixed source -> ${found} (/pi, polled)`);
  }, PI_POLL_INTERVAL_MS);
  console.log(`[rotator] started, polling interval=${PI_POLL_INTERVAL_MS}ms`);
}

// CALL コマンドと同等の起動を冪等に行うヘルパ。
// initialize 時にブラウザから呼ばれることを想定。すでに WebRTC セッションが
// 動いていれば何もしないので、複数クライアントからの同時呼び出しも安全。
export function ensureWebRtcSession(): void {
  if (isWebRtcSessionActive()) {
    return;
  }
  startWebRTCSession();
  startCameraRotation();
}

export function stopCameraRotation(): void {
  setOnPeerConnected(null);
  stopRecReqRetry();
  if (piPollTimer) {
    clearInterval(piPollTimer);
    piPollTimer = null;
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
