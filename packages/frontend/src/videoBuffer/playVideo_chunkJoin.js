import { videoBufferState } from "../state/videoBufferState";
export async function playVideo() {
    if (!videoBufferState.sourceBuffer ||
        videoBufferState.appending ||
        !videoBufferState.queue.length)
        return;
    if (videoBufferState.sourceBuffer.updating ||
        videoBufferState.mediaSource.readyState !== "open")
        return;
    videoBufferState.appending = true;
    const chunk = videoBufferState.queue.shift();
    try {
        videoBufferState.sourceBuffer.appendBuffer(chunk);
        if (videoBufferState.videoElement.paused) {
            await videoBufferState.videoElement.play().catch(() => { });
        }
    }
    catch (e) {
        console.error("appendBuffer failed:", e);
        videoBufferState.appending = false;
    }
}
