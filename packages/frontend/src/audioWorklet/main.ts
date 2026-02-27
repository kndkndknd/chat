import { contextState, audioWorkletState } from "../state";
import { Socket } from "socket.io-client";
import { toBase64 } from "../canvasEvent/toBase64";
import { bufferSizeState } from "../state";

export async function initAudioWorklet(stream: MediaStream, socket: Socket) {
  await contextState.audioContext.audioWorklet.addModule("chat-processor.js");
  const source = contextState.audioContext.createMediaStreamSource(stream);
  audioWorkletState.audioWorklet = new AudioWorkletNode(
    contextState.audioContext,
    "chat-processor",
    {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      processorOptions: {
        initialBufferLength: audioWorkletState.length,
      },
    },
  );

  // メッセージ受信（ワークレット → メイン）
  audioWorkletState.audioWorklet.port.onmessage = async (event) => {
    if (Object.values(audioWorkletState.flag).every((flag) => flag === false)) {
      return;
    }
    // if (
    //   audioWorkletState.flag.CHAT === false &&
    //   audioWorkletState.flag.PLAYBACK === false &&
    //   audioWorkletState.flag.TIMELAPSE === false
    // ) {
    //   // console.log("no stream source flag is true, skip sending buffer");
    //   return;
    // }
    const { type, payload } = event.data ?? {};
    if (type === "buffer") {
      // payload は Transfer された ArrayBuffer（Float32Array の中身）
      // 必要ならメタを付けて送る。ここでは生バイナリでPOST
      try {
        const ab: ArrayBuffer = payload; // Float32Array.buffer
        console.log(Object.keys(audioWorkletState.flag));
        Object.keys(audioWorkletState.flag).forEach((streamSource) => {
          if (audioWorkletState.flag[streamSource]) {
            // socket.emit("audiobufferFromClient", {
            //   buffer: ab,
            //   type: streamSource,
            // });
            console.log("workletFromClient emit:", streamSource);
            socket.emit("workletBufferFromClient", {
              video: toBase64(),
              audio: ab,
              source: streamSource,
              bufferSize: bufferSizeState.bufferSize,
            });
            if (streamSource === "CHAT" || streamSource === "TIMELAPSE") {
              // CHAT と TIMELAPSE は送信後にフラグを下ろす
              audioWorkletState.flag[streamSource] = false;
            }
          }
        });
      } catch (err) {
        console.error("POST failed:", err);
      }
    } else if (type === "log") {
      console.log("[worklet]", payload);
    }
  };

  // 接続（source -> worklet）
  source.connect(audioWorkletState.audioWorklet);
}

// 動的に bufferLengthState を変更したい場合
export function setBufferLengthState(next: number) {
  audioWorkletState.length = Math.max(1, next | 0); // 1以上の整数に
  if (audioWorkletState.audioWorklet) {
    audioWorkletState.audioWorklet.port.postMessage({
      type: "updateBufferLengthState",
      payload: audioWorkletState.length,
    });
  }
}
