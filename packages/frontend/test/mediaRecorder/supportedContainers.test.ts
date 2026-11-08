import { afterEach, describe, expect, test, vi } from "vitest";
import { supportedContainers } from "../../src/mediaRecorder/recorder";

const stubMediaRecorder = (supported: string[]) => {
  vi.stubGlobal("MediaRecorder", {
    isTypeSupported: (type: string) => supported.includes(type),
  });
};

describe("supportedContainers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("WebM が使える場合は WebM のみ返す", () => {
    stubMediaRecorder([
      "video/webm;codecs=vp9,opus",
      "video/ogg;codecs=vp9,opus",
    ]);
    expect(supportedContainers()).toEqual([
      { container: "webm", mimeType: "video/webm;codecs=vp9,opus" },
    ]);
  });

  test("WebM が使えない場合は Ogg にフォールバックする", () => {
    stubMediaRecorder(["video/ogg;codecs=vp9,opus"]);
    expect(supportedContainers()).toEqual([
      { container: "ogg", mimeType: "video/ogg;codecs=vp9,opus" },
    ]);
  });

  test("どちらも使えない場合は空配列を返す", () => {
    stubMediaRecorder([]);
    expect(supportedContainers()).toEqual([]);
  });

  test("MediaRecorder が無い環境では空配列を返す", () => {
    expect(supportedContainers()).toEqual([]);
  });
});
