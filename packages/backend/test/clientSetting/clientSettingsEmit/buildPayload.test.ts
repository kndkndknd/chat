import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../../src/state", () => ({
  clientState: { client: {} as Record<string, any> },
}));
vi.mock("../../../src/state/states/ioState", () => ({
  ioState: { io: null },
}));

import { buildPayload } from "../../../src/clientSetting/clientSettingsEmit";
import { clientState } from "../../../src/state";

describe("buildPayload", () => {
  beforeEach(() => {
    for (const k of Object.keys(clientState.client))
      delete (clientState.client as any)[k];
  });

  test("client が存在しなければ null を返す", () => {
    expect(buildPayload("missing")).toBeNull();
  });

  test("facedetection は client.facedetection をそのまま返す", () => {
    (clientState.client as any).c1 = { facedetection: true, hanged: false };
    expect(buildPayload("c1")).toEqual({ facedetection: true, hanged: false });
  });

  test("client.facedetection が false なら facedetection は false", () => {
    (clientState.client as any).c1 = { facedetection: false, hanged: true };
    expect(buildPayload("c1")).toEqual({ facedetection: false, hanged: true });
  });

  test("hanged はそのまま反映される", () => {
    (clientState.client as any).c1 = { facedetection: false, hanged: true };
    expect(buildPayload("c1")?.hanged).toBe(true);
  });
});
