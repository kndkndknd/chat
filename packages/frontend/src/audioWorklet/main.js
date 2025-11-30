import { contextState, audioWorkletState } from "../state";
export async function initAudioWorklet(stream, socket) {
    await contextState.audioContext.audioWorklet.addModule("chat-processor.js");
    const source = contextState.audioContext.createMediaStreamSource(stream);
    audioWorkletState.audioWorklet = new AudioWorkletNode(contextState.audioContext, "chat-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
        processorOptions: {
            initialBufferLength: audioWorkletState.length,
        },
    });
    // メッセージ受信（ワークレット → メイン）
    audioWorkletState.audioWorklet.port.onmessage = async (event) => {
        if (audioWorkletState.flag.CHAT === false &&
            audioWorkletState.flag.PLAYBACK === false &&
            audioWorkletState.flag.TIMELAPSE === false) {
            return;
        }
        const { type, payload } = event.data ?? {};
        if (type === "buffer") {
            // payload は Transfer された ArrayBuffer（Float32Array の中身）
            // 必要ならメタを付けて送る。ここでは生バイナリでPOST
            try {
                const ab = payload; // Float32Array.buffer
                Object.keys(audioWorkletState.flag).forEach((streamType) => {
                    if (audioWorkletState.flag[streamType]) {
                        socket.emit("audiobufferFromClient", {
                            buffer: ab,
                            type: streamType,
                        });
                        if (streamType !== "PLAYBACK") {
                            // CHAT と TIMELAPSE は送信後にフラグを下ろす
                            audioWorkletState.flag[streamType] = false;
                        }
                    }
                });
                // await fetch("https://localhost:8888/api/buffer", {
                //   method: "POST",
                //   headers: {
                //     "Content-Type": "application/octet-stream",
                //     // 参考: 任意ヘッダ（サーバ側で利用するなら）
                //     "X-Sample-Rate": String(contextState.audioContext?.sampleRate ?? 0),
                //     "X-Format": "f32le-mono",
                //     "X-Frames": String(
                //       (ab.byteLength / Float32Array.BYTES_PER_ELEMENT) | 0
                //     ),
                //   },
                //   body: ab,
                //   // keepalive はページ遷移時の送信継続用。必要なら true に。
                //   // keepalive: true,
                // });
            }
            catch (err) {
                console.error("POST failed:", err);
            }
        }
        else if (type === "log") {
            console.log("[worklet]", payload);
        }
    };
    // 接続（source -> worklet）
    source.connect(audioWorkletState.audioWorklet);
}
// 動的に bufferLengthState を変更したい場合
export function setBufferLengthState(next) {
    audioWorkletState.length = Math.max(1, next | 0); // 1以上の整数に
    if (audioWorkletState.audioWorklet) {
        audioWorkletState.audioWorklet.port.postMessage({
            type: "updateBufferLengthState",
            payload: audioWorkletState.length,
        });
    }
}
