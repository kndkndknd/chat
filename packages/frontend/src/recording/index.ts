import { socketState } from "../state";

const MIME_TYPE = "video/webm;codecs=vp8,opus";
const VIDEO_BITRATE = 400_000;
const AUDIO_BITRATE = 96_000;

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let recordButton: HTMLButtonElement | null = null;

// export function initRecordButton(stream: MediaStream): void {
//   recordButton = document.createElement("button");
//   recordButton.id = "recBtn";
//   recordButton.textContent = "⏺";
//   recordButton.style.cssText = [
//     "position:fixed",
//     "bottom:24px",
//     "right:24px",
//     "z-index:10",
//     "width:52px",
//     "height:52px",
//     "border-radius:50%",
//     "border:2px solid rgba(255,255,255,0.6)",
//     "background:rgba(30,30,30,0.7)",
//     "color:#fff",
//     "font-size:20px",
//     "cursor:pointer",
//     "display:flex",
//     "align-items:center",
//     "justify-content:center",
//   ].join(";");

//   recordButton.addEventListener("click", () => toggleRecording(stream));
//   document.body.appendChild(recordButton);
// }

export function toggleRecording(stream: MediaStream): void {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  } else {
    startRecording(stream);
  }
}

function startRecording(stream: MediaStream): void {
  if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
    console.error("codec not supported:", MIME_TYPE);
    return;
  }
  console.log("chunk size:", chunks.length);
  chunks = [];
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: MIME_TYPE,
    videoBitsPerSecond: VIDEO_BITRATE,
    audioBitsPerSecond: AUDIO_BITRATE,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: MIME_TYPE });
    console.log("Recorded blob size:", blob.size);
    blob.arrayBuffer().then((buffer) => {
      socketState.socket?.emit("bufferRecFromClient", buffer);
    });
    setButtonState(false);
  };

  mediaRecorder.start();
  setButtonState(true);
}

export function stopChunkedRecording(): void {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

export function startChunkedRecording(stream: MediaStream): void {
  if (mediaRecorder && mediaRecorder.state === "recording") return;
  if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
    console.error("codec not supported:", MIME_TYPE);
    return;
  }
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: MIME_TYPE,
    videoBitsPerSecond: VIDEO_BITRATE,
    audioBitsPerSecond: AUDIO_BITRATE,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      e.data.arrayBuffer().then((buffer) => {
        socketState.socket?.emit("bufferFromClient", buffer);
      });
    }
  };

  mediaRecorder.onstop = () => {
    setButtonState(false);
  };

  mediaRecorder.start(1000);
  setButtonState(true);
}

function setButtonState(isRecording: boolean): void {
  if (!recordButton) return;
  recordButton.textContent = isRecording ? "⏹" : "⏺";
  recordButton.style.background = isRecording
    ? "rgba(200,40,40,0.85)"
    : "rgba(30,30,30,0.7)";
}
