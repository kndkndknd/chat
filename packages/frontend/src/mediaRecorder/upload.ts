import type { Recording } from './recorder.ts'
import type { SocketFacade } from '../socket/SocketFacade'

export type UploadResult = {
  recording: Recording
}

/**
 * 録画データを WebSocket 経由でサーバへ送信する。
 *
 * Blob は SocketFacade.emit の中で JSON シリアライズできないため、
 * 事前に ArrayBuffer へ変換する。ArrayBuffer は SocketFacade.serialize が
 * base64 化して送出し、サーバ側 deserialize が復元する
 * （workletBufferFromClient 等と同じ仕組み）。
 */
export async function uploadRecording(
  recording: Recording,
  socket: SocketFacade,
): Promise<UploadResult> {
  const buffer = await recording.blob.arrayBuffer()
  socket.emit('mediaUploadFromClient', {
    container: recording.container,
    mimeType: recording.mimeType,
    blob: buffer,
  })
  return { recording }
}
