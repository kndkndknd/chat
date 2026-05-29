import * as faceapi from "face-api.js";
import { canvasElement } from "../canvasEvent/canvasElement";
import { socketState } from "../state";

const MODEL_URL = "/models";
const CLOSE_RATIO = 0.4;
const BLINK_INTERVAL_MS = 1000;

let overlayCanvas: HTMLCanvasElement | null = null;
let comeCloserEl: HTMLDivElement | null = null;
let active = false;
let modelsLoaded = false;
let showComeCloser = false;
let comeCloserVisible = false;
let wasLargeFace = false;
let blinkTimer: number | null = null;

const ensureComeCloserEl = (): HTMLDivElement => {
  if (comeCloserEl) return comeCloserEl;
  const el = document.createElement("div");
  el.id = "comeCloser";
  el.textContent = "come closer";
  el.style.cssText =
    "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
    "z-index:4;pointer-events:none;color:#fff;font-size:8vw;font-weight:bold;" +
    "text-shadow:0 0 8px #000;display:none;";
  document.getElementById("wrapper")!.appendChild(el);
  comeCloserEl = el;
  return el;
};

const setComeCloserVisible = (visible: boolean) => {
  comeCloserVisible = visible;
  if (comeCloserEl) comeCloserEl.style.display = visible ? "block" : "none";
};

const startBlink = () => {
  if (blinkTimer !== null) return;
  blinkTimer = window.setInterval(() => {
    if (!showComeCloser) {
      if (comeCloserVisible) setComeCloserVisible(false);
      return;
    }
    setComeCloserVisible(!comeCloserVisible);
  }, BLINK_INTERVAL_MS);
};

const stopBlink = () => {
  if (blinkTimer !== null) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }
};

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
  ensureComeCloserEl();

  active = true;
  startBlink();
  detectLoop();
}

export function stopFaceDetection(): void {
  active = false;
  stopBlink();
  showComeCloser = false;
  wasLargeFace = false;
  setComeCloserVisible(false);
  if (overlayCanvas) {
    const ctx = overlayCanvas.getContext("2d");
    ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  }
}

async function detectLoop(): Promise<void> {
  if (!active || !overlayCanvas) return;

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
      const ratio = height / window.innerHeight;
      if (ratio >= CLOSE_RATIO) {
        showComeCloser = false;
        setComeCloserVisible(false);
        if (!wasLargeFace) {
          socketState.socket?.emit("faceDetectFromClient", { x, width, height });
        }
        wasLargeFace = true;
      } else {
        wasLargeFace = false;
        showComeCloser = true;
      }
    } else {
      wasLargeFace = false;
      showComeCloser = false;
      setComeCloserVisible(false);
    }
  }

  setTimeout(() => detectLoop(), 100);
}
