import { describe, expect, test } from "vitest";
import {
  isAllowedSource,
  isChatData,
  isConnectData,
  isFaceDetectData,
  isGainData,
  isIceCandidate,
  isMediaUploadData,
  isRelayRegisterData,
  isResizeData,
  isSdpDescription,
  isStreamReqData,
  isWholeData,
  isWorkletData,
} from "../../src/socket/validateMessage";

const audio = new ArrayBuffer(8192);

describe("validateMessage", () => {
  test("許可された stream source だけを受け付ける", () => {
    expect(isAllowedSource("CHAT")).toBe(true);
    expect(isAllowedSource("PLAYBACK")).toBe(true);
    expect(isAllowedSource("UNKNOWN")).toBe(false);
    expect(isAllowedSource("")).toBe(false);
    expect(isAllowedSource(123)).toBe(false);
  });

  test("connectFromClient の必須項目を検証する", () => {
    expect(
      isConnectData({
        urlPathName: "/1",
        width: 100,
        height: 200,
        isMobile: false,
      }),
    ).toBe(true);
    expect(isConnectData({ width: 100 })).toBe(false);
    expect(isConnectData({ urlPathName: "/1", width: "100" })).toBe(false);
  });

  test("chatFromClient の audio / source を検証する", () => {
    expect(
      isChatData({
        source: "CHAT",
        audio,
        video: "",
        bufferSize: 8192,
      }),
    ).toBe(true);
    expect(
      isChatData({
        source: "UNKNOWN",
        audio,
        video: "",
        bufferSize: 8192,
      }),
    ).toBe(false);
    expect(
      isChatData({
        source: "CHAT",
        audio: "not-buffer",
        video: "",
        bufferSize: 8192,
      }),
    ).toBe(false);
  });

  test("workletBufferFromClient の bufferSize を検証する", () => {
    expect(
      isWorkletData({
        source: "CHAT",
        audio,
        video: "",
        bufferSize: 8192,
      }),
    ).toBe(true);
    expect(
      isWorkletData({
        source: "CHAT",
        audio,
        video: "",
        bufferSize: 0,
      }),
    ).toBe(false);
    expect(
      isWorkletData({
        source: "CHAT",
        audio,
        video: "",
        bufferSize: 8192,
        index: 1,
      }),
    ).toBe(true);
  });

  test("その他のペイロードを検証する", () => {
    expect(isStreamReqData({ source: "PLAYBACK", index: 1 })).toBe(true);
    expect(isStreamReqData({ source: "UNKNOWN" })).toBe(false);
    expect(isResizeData({ width: 100, height: 200 })).toBe(true);
    expect(isResizeData({ width: "100" })).toBe(false);
    expect(isGainData({ MASTER: 1, CHAT: 0.5 })).toBe(true);
    expect(isGainData({ MASTER: "1" })).toBe(false);
    expect(
      isMediaUploadData({
        container: "webm",
        mimeType: "video/webm",
        blob: audio,
      }),
    ).toBe(true);
    expect(
      isWholeData({
        audio,
        video: "",
        source: "CHAT",
        bufferSize: 8192,
      }),
    ).toBe(true);
    expect(
      isFaceDetectData({ x: 1, width: 100, height: 100 }),
    ).toBe(true);
    expect(isFaceDetectData({ x: 1 })).toBe(false);
    expect(isRelayRegisterData({ role: "sender" })).toBe(true);
    expect(isRelayRegisterData({ role: "other" })).toBe(false);
    expect(
      isSdpDescription({ type: "offer", sdp: "v=0" }),
    ).toBe(true);
    expect(isSdpDescription({ sdp: "v=0" })).toBe(false);
    expect(
      isIceCandidate({ candidate: "candidate:1", sdpMid: "0" }),
    ).toBe(true);
    expect(isIceCandidate({ sdpMid: "0" })).toBe(false);
  });
});
