import * as faceapi from "face-api.js";
import { canvasElement } from "../canvasEvent/canvasElement";
import { socketState } from "../state";

const MODEL_URL = "/models";
const COOLDOWN = 30000;

let overlayCanvas: HTMLCanvasElement | null = null;
let active = false;
let modelsLoaded = false;
let lastDetectedAt: number | null = null;

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
      const now = Date.now();
      const inCooldown = lastDetectedAt !== null && now - lastDetectedAt < COOLDOWN;

      faceapi.draw.drawFaceLandmarks(overlayCanvas, resized);
      if (!inCooldown) {
        const { x, width, height } = resized[0].detection.box;
        socketState.socket?.emit("faceDetectFromClient", { x, width, height });
        lastDetectedAt = now;
      }
    }
  }

  setTimeout(() => detectLoop(), 100);
}
