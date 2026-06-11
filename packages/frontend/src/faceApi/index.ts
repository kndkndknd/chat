import * as faceapi from "face-api.js";
import { canvasElement } from "../canvasEvent/canvasElement";
import { socketState } from "../state";

const MODEL_URL = "/models";
// 顔の向きの許容範囲。鼻先が顔の中心からこの割合以内なら「正面に近い」とみなす（正面±40%）。
const FRONTAL_RATIO = 0.4;

// 検出ループの間隔。短いほど顔認識の反応は速いが、TF.js/WebGL 推論が頻繁に走り
// メインスレッド/GPU を専有するため、同居する WebRTC リレー映像の消去ペイント等が
// 遅れる。/1,/2 端末の表示終了の即時性を上げるため間引いている（旧 100ms）。
const DETECT_INTERVAL_MS = 250;

let overlayCanvas: HTMLCanvasElement | null = null;
let active = false;
let modelsLoaded = false;
let wasFrontal = false;

// 正面から外れているときにウィンドウ全体を白黒点滅させるためのオーバーレイ。
let flashOverlay: HTMLDivElement | null = null;
let flashTimer: ReturnType<typeof setInterval> | null = null;
let flashWhite = false;
// faceDetectScenario 起動後、この時刻までは点滅を無効化する（90秒間）。
let flashDisabledUntil = 0;

const FLASH_DISABLE_MS = 90 * 1000;

// 顔認識が成立した瞬間に、カメラ映像を1フレームだけ静止画としてキャプチャし、
// 全画面に1秒間だけ表示するためのオーバーレイ。
let snapshotOverlay: HTMLCanvasElement | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

// キャプチャした1フレームを表示し続ける時間。
const SNAPSHOT_DURATION_MS = 1000;

// 顔認識成立の瞬間のカメラ映像を1フレームだけ取り込み、1秒間だけ全画面表示する。
// drawImage を一度だけ行うため、表示されるのは更新されない静止画（=1フレーム）。
function showCapturedFrame(): void {
  const video = canvasElement.video;
  if (video.readyState < 2 || video.videoWidth === 0) return;

  if (!snapshotOverlay) {
    snapshotOverlay = document.createElement("canvas");
    snapshotOverlay.id = "faceSnapshot";
    snapshotOverlay.style.cssText =
      "position:fixed;inset:0;z-index:9998;pointer-events:none;background:#000;";
    document.body.appendChild(snapshotOverlay);
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  snapshotOverlay.width = cw;
  snapshotOverlay.height = ch;

  const ctx = snapshotOverlay.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);

  // アスペクト比を保って画面に収める（contain）。
  const scale = Math.min(cw / vw, ch / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);

  snapshotOverlay.style.display = "block";

  if (snapshotTimer !== null) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    if (snapshotOverlay) snapshotOverlay.style.display = "none";
    snapshotTimer = null;
  }, SNAPSHOT_DURATION_MS);
}

function hideCapturedFrame(): void {
  if (snapshotTimer !== null) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
  if (snapshotOverlay) {
    snapshotOverlay.style.display = "none";
  }
}

// faceDetectScenario 実行中〜終了後の一定時間は、この時刻まで顔認識自体を停止する。
// サーバーの faceDetectBlockFromServer 通知で設定される。
let faceDetectBlockedUntil = 0;

// faceDetectScenario 実行に伴い、durationMs ミリ秒だけ顔認識をブロックする。
export function blockFaceDetection(durationMs: number): void {
  faceDetectBlockedUntil = Date.now() + durationMs;
}

function startFlashing(): void {
  if (Date.now() < flashDisabledUntil) return;
  if (flashTimer !== null) return;
  if (!flashOverlay) {
    flashOverlay = document.createElement("div");
    flashOverlay.id = "faceFlash";
    flashOverlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;pointer-events:none;";
    document.body.appendChild(flashOverlay);
  }
  flashOverlay.style.display = "block";
  // 1fps（1秒ごとに白⇔黒を切り替え）で点滅させる。
  const tick = (): void => {
    flashWhite = !flashWhite;
    flashOverlay!.style.backgroundColor = flashWhite ? "#fff" : "#000";
  };
  tick();
  flashTimer = setInterval(tick, 500);
}

function stopFlashing(): void {
  if (flashTimer !== null) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  flashWhite = false;
  if (flashOverlay) {
    flashOverlay.style.display = "none";
  }
}

export async function initFaceDetection(): Promise<void> {
  if (active) return;
  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  }

  if (!overlayCanvas) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.id = "faceCanvas";
    overlayCanvas.style.cssText =
      "position:absolute;top:0;left:0;z-index:3;pointer-events:none;";
    document.getElementById("wrapper")!.appendChild(overlayCanvas);
  }

  active = true;
  detectLoop();
}

export function stopFaceDetection(): void {
  active = false;
  wasFrontal = false;
  stopFlashing();
  hideCapturedFrame();
  if (overlayCanvas) {
    const ctx = overlayCanvas.getContext("2d");
    ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }
}

async function detectLoop(): Promise<void> {
  if (!active || !overlayCanvas) return;

  // faceDetectScenario 実行中〜終了後の一定時間は顔認識をブロックする。
  // 認識処理（detectAllFaces）も emit も行わず、次のループまで待つ。
  if (Date.now() < faceDetectBlockedUntil) {
    const ctx = overlayCanvas.getContext("2d");
    ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    stopFlashing();
    wasFrontal = false;
    setTimeout(() => detectLoop(), DETECT_INTERVAL_MS);
    return;
  }

  const video = canvasElement.video;

  if (video.readyState >= 2 && video.videoWidth > 0) {
    const displaySize = { width: window.innerWidth, height: window.innerHeight };

    faceapi.matchDimensions(overlayCanvas, displaySize);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = overlayCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (detections.length > 0) {
      faceapi.draw.drawFaceLandmarks(overlayCanvas, resized);
      const { x, width, height } = resized[0].detection.box;

      // 68点ランドマークから顔の向きを推定する。
      // 左右の顎輪郭の中点（顔の中心）に対する鼻先の水平オフセットを、
      // 顔の半幅で正規化した値で正面度を測る（中央=0、真横=±1）。
      const positions = resized[0].landmarks.positions;
      const leftJaw = positions[0];
      const rightJaw = positions[16];
      const noseTip = positions[30];
      const faceCenterX = (leftJaw.x + rightJaw.x) / 2;
      const halfFaceWidth = (rightJaw.x - leftJaw.x) / 2;
      const frontalOffset =
        halfFaceWidth > 0 ? (noseTip.x - faceCenterX) / halfFaceWidth : 1;

      if (Math.abs(frontalOffset) <= FRONTAL_RATIO) {
        if (!wasFrontal) {
          socketState.socket?.emit("faceDetectFromClient", { x, width, height });
          // 顔認識成立の瞬間に、カメラ映像を1フレームだけ1秒間表示する。
          showCapturedFrame();
          // faceDetectScenario が始まるので、90秒間は点滅を無効化する。
          flashDisabledUntil = Date.now() + FLASH_DISABLE_MS;
        }
        wasFrontal = true;
        stopFlashing();
      } else {
        wasFrontal = false;
        // 正面から外れている（オフセットが±0.4超）ので白黒点滅させる。
        startFlashing();
      }
    } else {
      wasFrontal = false;
      stopFlashing();
    }
  } else {
    stopFlashing();
  }

  setTimeout(() => detectLoop(), DETECT_INTERVAL_MS);
}
