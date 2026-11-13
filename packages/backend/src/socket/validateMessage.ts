import { streamList } from "../data";

const MAX_SOURCE_LENGTH = 128;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_CHARS = 2 * 1024 * 1024;
const MAX_BUFFER_SIZE = 1 << 20;

export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
  value instanceof ArrayBuffer;

export const isAllowedSource = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_SOURCE_LENGTH &&
  (value === "CHAT" || streamList.includes(value));

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || isFiniteNumber(value);

export type ConnectData = {
  clientMode?: string;
  urlPathName: string;
  width?: number;
  height?: number;
  isMobile?: boolean;
};

export const isConnectData = (value: unknown): value is ConnectData =>
  isRecord(value) &&
  typeof value.urlPathName === "string" &&
  (value.clientMode === undefined || typeof value.clientMode === "string") &&
  isOptionalNumber(value.width) &&
  isOptionalNumber(value.height) &&
  (value.isMobile === undefined || typeof value.isMobile === "boolean");

export type ChatData = {
  source: string;
  audio: ArrayBuffer;
  video: string;
  bufferSize: number;
  from?: string;
};

export const isChatData = (value: unknown): value is ChatData =>
  isRecord(value) &&
  isAllowedSource(value.source) &&
  isArrayBuffer(value.audio) &&
  value.audio.byteLength > 0 &&
  value.audio.byteLength <= MAX_AUDIO_BYTES &&
  typeof value.video === "string" &&
  value.video.length <= MAX_VIDEO_CHARS &&
  isFiniteNumber(value.bufferSize) &&
  value.bufferSize > 0 &&
  value.bufferSize <= MAX_BUFFER_SIZE &&
  (value.from === undefined || typeof value.from === "string");

export type WorkletData = {
  video: string;
  audio: ArrayBuffer;
  source: string;
  bufferSize: number;
  index?: number;
};

export const isWorkletData = (value: unknown): value is WorkletData =>
  isRecord(value) &&
  isAllowedSource(value.source) &&
  isArrayBuffer(value.audio) &&
  value.audio.byteLength > 0 &&
  value.audio.byteLength <= MAX_AUDIO_BYTES &&
  typeof value.video === "string" &&
  value.video.length <= MAX_VIDEO_CHARS &&
  isFiniteNumber(value.bufferSize) &&
  value.bufferSize > 0 &&
  value.bufferSize <= MAX_BUFFER_SIZE &&
  (value.index === undefined || isFiniteNumber(value.index));

export type StreamReqData = { source: string; index?: number };

export const isStreamReqData = (value: unknown): value is StreamReqData =>
  isRecord(value) &&
  isAllowedSource(value.source) &&
  (value.index === undefined || isFiniteNumber(value.index));

export const isResizeData = (
  value: unknown,
): value is { width?: number; height?: number } =>
  isRecord(value) &&
  isOptionalNumber(value.width) &&
  isOptionalNumber(value.height);

export const isGainData = (value: unknown): value is Record<string, number> =>
  isRecord(value) &&
  Object.values(value).every((item) => isFiniteNumber(item));

export const isMediaUploadData = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.container === "string" &&
  typeof value.mimeType === "string" &&
  isArrayBuffer(value.blob);

export type WholeData = {
  audio: ArrayBuffer;
  video: string;
  source: string;
  bufferSize: number;
};

export const isWholeData = (value: unknown): value is WholeData =>
  isRecord(value) &&
  isArrayBuffer(value.audio) &&
  value.audio.byteLength > 0 &&
  value.audio.byteLength <= MAX_AUDIO_BYTES &&
  typeof value.video === "string" &&
  value.video.length <= MAX_VIDEO_CHARS &&
  isAllowedSource(value.source) &&
  isFiniteNumber(value.bufferSize) &&
  value.bufferSize > 0 &&
  value.bufferSize <= MAX_BUFFER_SIZE;

export const isFaceDetectData = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.width) &&
  isFiniteNumber(value.height);

export type RelayRegisterData = { role: "sender" | "receiver" };

export const isRelayRegisterData = (
  value: unknown,
): value is RelayRegisterData =>
  isRecord(value) &&
  (value.role === "sender" || value.role === "receiver");

export const isSdpDescription = (
  value: unknown,
): value is RTCSessionDescriptionInit =>
  isRecord(value) &&
  typeof value.type === "string" &&
  (value.sdp === undefined || typeof value.sdp === "string");

export const isIceCandidate = (
  value: unknown,
): value is RTCIceCandidateInit =>
  isRecord(value) && typeof value.candidate === "string";
