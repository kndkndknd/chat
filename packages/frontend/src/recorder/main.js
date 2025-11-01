const SERVER_URL = "https://localhost:8888";
const app = document.querySelector("#wrapper");
if (!app) {
    throw new Error("#wrapper が見つかりません");
}
app.innerHTML = `
  <main style="font-family: system-ui; max-width: 720px; margin: 2rem auto; padding: 1.5rem;">
    <h1 style="margin-bottom: 1rem;">ブラウザ録画 → HLS配信</h1>
    <section>
      <video id="preview" playsinline autoplay muted style="width: 100%; background: #000; border-radius: 0.5rem;"></video>
    </section>
    <section style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <button id="startBtn" type="button">録画開始</button>
      <button id="stopBtn" type="button" disabled>録画停止</button>
    </section>
    <section style="margin-top: 1rem;">
      <div id="status" role="status">待機中</div>
      <details style="margin-top: 0.5rem;">
        <summary>エンドポイント情報</summary>
      </details>
    </section>
  </main>
`;
const previewEl = document.querySelector("#preview");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const statusEl = document.querySelector("#status");
if (!previewEl || !startBtn || !stopBtn || !statusEl) {
    throw new Error("初期化に失敗しました");
}
let mediaRecorder = null;
let mediaStream = null;
let uploadChain = Promise.resolve();
let isRecording = false;
const updateStatus = (message) => {
    statusEl.textContent = message;
};
const sendChunk = async (chunk) => {
    if (chunk.size === 0) {
        return;
    }
    try {
        console.log(chunk);
        const response = await fetch(`${SERVER_URL}/api/ingest`, {
            method: "POST",
            headers: {
                // "Content-Type": chunk.type || "video/webm",
                "Content-Type": "video/webm",
            },
            body: chunk,
        });
        if (!response.ok) {
            throw new Error(`アップロード失敗: ${response.status}`);
        }
    }
    catch (error) {
        console.error(error);
        updateStatus("アップロード中にエラーが発生しました。録画を停止してください。");
        stopRecording().catch((err) => console.error(err));
    }
};
const requestCamera = async () => {
    return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
        },
    });
};
const startRecording = async () => {
    if (isRecording) {
        return;
    }
    try {
        updateStatus("カメラアクセスを要求中…");
        mediaStream = await requestCamera();
        previewEl.srcObject = mediaStream;
        const options = {
            mimeType: "video/webm;codecs=vp8,opus",
            videoBitsPerSecond: 2000000,
        };
        mediaRecorder = new MediaRecorder(mediaStream, options);
        mediaRecorder.addEventListener("dataavailable", (event) => {
            const { data } = event;
            uploadChain = uploadChain.then(() => sendChunk(data));
        });
        mediaRecorder.addEventListener("stop", () => {
            uploadChain = uploadChain.then(async () => {
                await fetch(`${SERVER_URL}/api/stop`, { method: "POST" }).catch((error) => {
                    console.error(error);
                });
            });
        });
        mediaRecorder.start(1000);
        isRecording = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus("録画中… HLS出力が数秒後に更新されます。");
    }
    catch (error) {
        console.error(error);
        updateStatus("カメラの初期化に失敗しました。");
    }
};
const stopRecording = async () => {
    if (!isRecording) {
        return;
    }
    mediaRecorder?.stop();
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaRecorder = null;
    mediaStream = null;
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus("録画を停止しました。");
};
startBtn.addEventListener("click", () => {
    startRecording().catch((error) => console.error(error));
});
stopBtn.addEventListener("click", () => {
    stopRecording().catch((error) => console.error(error));
});
window.addEventListener("beforeunload", () => {
    if (isRecording) {
        mediaRecorder?.stop();
        mediaStream?.getTracks().forEach((track) => track.stop());
    }
});
