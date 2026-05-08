import { contextState, audioWorkletState } from "../state";
import { SocketFacade } from "../socket/SocketFacade";
import { toBase64 } from "../canvasEvent/toBase64";
import { bufferSizeState, wholeState } from "../state";

export async function chatScriptProcessor(
  stream: MediaStream,
  socket: SocketFacade,
) {
  if (!contextState.audioContext) {
    throw new Error("AudioContext is not initialized.");
  }
  const ctx = contextState.audioContext;
  const source = ctx.createMediaStreamSource(stream);
  const bufferSize = bufferSizeState.bufferSize;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  audioWorkletState.chat.audioWorklet = node;

  node.onaudioprocess = (event: AudioProcessingEvent) => {
    const outputBuffer = event.outputBuffer;
    for (let ch = 0; ch < outputBuffer.numberOfChannels; ch++) {
      outputBuffer.getChannelData(ch).fill(0);
    }

    if (
      Object.values(audioWorkletState.chat.flag).every((flag) => flag === false)
    ) {
      return;
    }

    const channelData = event.inputBuffer.getChannelData(0);
    const ab: ArrayBuffer = new Float32Array(channelData).buffer;
    const video = toBase64();

    Object.keys(audioWorkletState.chat.flag).forEach((streamSource) => {
      if (audioWorkletState.chat.flag[streamSource]) {
        socket.emit("workletBufferFromClient", {
          video: video,
          audio: ab,
          source: streamSource,
          bufferSize: bufferSizeState.bufferSize,
        });
        if (streamSource === "CHAT" || streamSource === "TIMELAPSE") {
          audioWorkletState.chat.flag[streamSource] = false;
        }
      }
    });

    if (wholeState.flag) {
      wholeState.audio = ab;
      wholeState.video = video;
    }
  };

  source.connect(node);
  // ScriptProcessorNode requires a connection to destination to keep firing
  const silentGain = ctx.createGain();
  silentGain.gain.setValueAtTime(0, 0);
  node.connect(silentGain);
  silentGain.connect(ctx.destination);
}
