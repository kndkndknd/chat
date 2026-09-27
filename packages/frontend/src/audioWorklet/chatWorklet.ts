import { contextState, audioWorkletState } from "../state";
import { SocketFacade } from "../socket/SocketFacade";
import { toBase64 } from "../canvasEvent/toBase64";
import { bufferSizeState, wholeState } from "../state";
import { hasLoop, loopPlay } from "../stream/loop/loopPlay";

let messageCount = 0; // CHAT/TIMELAPSE 以外の送信を間引くためのカウンタ

export async function chatWorklet(stream: MediaStream, socket: SocketFacade) {
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
    const { type, payload } = event.data ?? {};
    if (type === "log") {
      console.log("[worklet]", payload);
      return;
    }
    if (type !== "buffer") {
      return;
    }

    messageCount++;
    // AudioWorklet のバッファ周期で定期的に LOOP 再生する（録音フラグには依存しない）
    if (messageCount % 8 === 0 && hasLoop()) {
      loopPlay();
    }

    // console.log("audioWorkletState.chat.flag:", audioWorkletState.chat.flag);
    if (
      Object.values(audioWorkletState.chat.flag).every((flag) => flag === false)
    ) {
      return;
    }
    if (messageCount % 8 !== 0) {
      return;
    }
    // payload は Transfer された ArrayBuffer（Float32Array の中身）
    // 必要ならメタを付けて送る。ここでは生バイナリでPOST
    try {
      const ab: ArrayBuffer = payload; // Float32Array.buffer
      const video = toBase64();
      console.log(Object.keys(audioWorkletState.chat.flag));
      Object.keys(audioWorkletState.chat.flag).forEach((streamSource) => {
        const isChatOrTimelapse =
          streamSource === "CHAT" || streamSource === "TIMELAPSE";
        // CHAT/TIMELAPSE 以外はフラグが立ち続けて毎回送信されるため、5回に1回だけ送信する
        if (audioWorkletState.chat.flag[streamSource]) {
          // socket.emit("audiobufferFromClient", {
          //   buffer: ab,
          //   type: streamSource,
          // });
          console.log("workletFromClient emit:", streamSource);
          socket.emit("workletBufferFromClient", {
            video: video,
            audio: ab,
            source: streamSource,
            bufferSize: bufferSizeState.bufferSize,
            ...(["PLAYBACK"].includes(streamSource)
              ? { index: audioWorkletState.chat.recordIndex.PLAYBACK }
              : {}),
          });
            
          console.log("audio buffer sent for source:", streamSource);
          if (streamSource === "CHAT" || streamSource === "TIMELAPSE") {
            // CHAT と TIMELAPSE は送信後にフラグを下ろす
            console.log("Resetting flag for source:", streamSource);
            audioWorkletState.chat.flag[streamSource] = false;
          }
        }
      });
      if(wholeState.flag) {
        wholeState.audio = ab;
        wholeState.video = video;
      }
    } catch (err) {
      console.error("POST failed:", err);
    }
  };

  // 接続（source -> worklet）
  source.connect(audioWorkletState.chat.audioWorklet);
}

// 動的に bufferLengthState を変更したい場合
export function setBufferLengthState(next: number) {
  audioWorkletState.chat.length = Math.max(1, next | 0); // 1以上の整数に
  const node = audioWorkletState.chat.audioWorklet;
  if (node && "port" in node) {
    node.port.postMessage({
      type: "updateBufferLengthState",
      payload: audioWorkletState.chat.length,
    });
  }
}
