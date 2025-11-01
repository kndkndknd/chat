import { videoBufferState } from "../state";
let switching = false;
export async function playVideo(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
        throw new Error("Invalid ArrayBuffer");
    }
    // 再生中はスキップ（本当に“再生中”かだけを見る）
    if (!videoBufferState.videoElement.paused &&
        !videoBufferState.videoElement.ended) {
        console.debug("playing now, skip this chunk");
        return;
    }
    if (switching)
        return; // 連打防止
    switching = true;
    // 旧URLを退避（src差し替え後に安全に revoke）
    const prevUrl = videoBufferState.currentObjectUrl;
    // 再生可能な MIME を決定
    const candidates = ["video/webm; codecs=vp8, opus", "video/webm"];
    const mime = candidates.find((m) => videoBufferState.videoElement.canPlayType(m)) ??
        "video/webm";
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    videoBufferState.currentObjectUrl = url;
    try {
        // src 差し替え → load() → play()
        videoBufferState.videoElement.src = url;
        videoBufferState.videoElement.preload = "auto";
        videoBufferState.videoElement.load();
        try {
            await videoBufferState.videoElement.play(); // 失敗時は例外
        }
        catch (err) {
            console.warn("video.play() failed:", err);
        }
        finally {
            switching = false;
        }
    }
    catch (err) {
        switching = false;
        console.log("error", err);
    }
    // 新しいメディアの読み込みが始まったら前のURLを破棄
    if (prevUrl) {
        try {
            URL.revokeObjectURL(prevUrl);
        }
        catch {
            console.warn("Failed to revoke previous object URL:", prevUrl);
        }
    }
}
