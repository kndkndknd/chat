import { contextState, audioWorkletState } from "../state";
// import { Socket } from "socket.io-client";
import { toBase64 } from "../canvasEvent/toBase64";
import { bufferSizeState, webSocketState } from "../state";
import { postStream } from "../postMessage/postStream";
import { buffStateType } from "../../../../types/streamType";

export async function chatWorklet(stream: MediaStream) {
  await contextState.audioContext.audioWorklet.addModule("chat-processor.js");
  const source = contextState.audioContext.createMediaStreamSource(stream);
  audioWorkletState.chat.audioWorklet = new AudioWorkletNode(
    contextState.audioContext,
    "chat-processor",
    {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      processorOptions: {
        initialBufferLength: audioWorkletState.chat.length,
      },
    },
  );

  // メッセージ受信（ワークレット → メイン）
  audioWorkletState.chat.audioWorklet.port.onmessage = async (event) => {
    // console.log("audioWorkletState.chat.flag:", audioWorkletState.chat.flag);
    if (
      Object.values(audioWorkletState.chat.flag).every((flag) => flag === false)
    ) {
      return;
    }
    console.log("Received message from AudioWorklet:", event.data);
    const { type, payload } = event.data ?? {};
    if (type === "buffer") {
      // payload は Transfer された ArrayBuffer（Float32Array の中身）
      // 必要ならメタを付けて送る。ここでは生バイナリでPOST
      try {
        const ab: ArrayBuffer = payload; // Float32Array.buffer
        console.log(Object.keys(audioWorkletState.chat.flag));
        Object.keys(audioWorkletState.chat.flag).forEach((streamSource) => {
          if (audioWorkletState.chat.flag[streamSource]) {
            // socket.emit("audiobufferFromClient", {
            //   buffer: ab,
            //   type: streamSource,
            // });
            console.log("workletFromClient emit:", streamSource);
            const stream: buffStateType = {
              source: streamSource,
              audio: ab,
              video: toBase64(),
              bufferSize: bufferSizeState.bufferSize,
              duration: ab.byteLength / 128 / 44100, // 仮の計算
              sampleRate: 44100,
              glitch: false,
            }
            postStream(stream);
            // webSocketState.socket.emit("workletBufferFromClient", {
            //   video: toBase64(),
            //   audio: ab,
            //   source: streamSource,
            //   bufferSize: bufferSizeState.bufferSize,
            // });
            if (streamSource === "CHAT" || streamSource === "TIMELAPSE") {
              // CHAT と TIMELAPSE は送信後にフラグを下ろす
              audioWorkletState.chat.flag[streamSource] = false;
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
  source.connect(audioWorkletState.chat.audioWorklet);
}

// 動的に bufferLengthState を変更したい場合
export function setBufferLengthState(next: number) {
  audioWorkletState.chat.length = Math.max(1, next | 0); // 1以上の整数に
  if (audioWorkletState.chat.audioWorklet) {
    audioWorkletState.chat.audioWorklet.port.postMessage({
      type: "updateBufferLengthState",
      payload: audioWorkletState.chat.length,
    });
  }
}
