import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: { client: {} as Record<string, any> },
}));
vi.mock("../../../src/state/states/ioState", () => ({
  ioState: { io: null },
}));
vi.mock("../../../src/state/states/personDetectState", () => ({
  personDetectState: { flag: false, timeoutId: null },
}));

import { buildPayload } from "../../../src/clientSetting/clientSettingsEmit";
import { clientState } from "../../../src/state";
import { personDetectState } from "../../../src/state/states/personDetectState";

describe("buildPayload", () => {
  beforeEach(() => {
    for (const k of Object.keys(clientState.client))
      delete (clientState.client as any)[k];
    personDetectState.flag = false;
    personDetectState.timeoutId = null;
  });

  test("client が存在しなければ null を返す", () => {
    expect(buildPayload("missing")).toBeNull();
  });

  test("facedetection は client.facedetection AND personDetectState.flag", () => {
    (clientState.client as any).c1 = { facedetection: true, hanged: false };
    personDetectState.flag = true;
    expect(buildPayload("c1")).toEqual({ facedetection: true, hanged: false });
  });

  test("personDetectState.flag が false なら facedetection は false", () => {
    (clientState.client as any).c1 = { facedetection: true, hanged: true };
    personDetectState.flag = false;
    expect(buildPayload("c1")).toEqual({ facedetection: false, hanged: true });
  });

  test("hanged はそのまま反映される", () => {
    (clientState.client as any).c1 = { facedetection: false, hanged: true };
    expect(buildPayload("c1")?.hanged).toBe(true);
  });
});
