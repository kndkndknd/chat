import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("../../src/state", () => ({
  clientState: {
    client: {} as Record<string, any>,
    cmdClient: [] as string[],
    streamClient: [] as string[],
    arduinoClient: {} as Record<string, boolean>,
  },
  streamState: { timelapse: false } as any,
  arduinoState: { host: "" } as any,
  bpmState: {} as Record<string, any>,
  bpmStateDefault: {
    bpm: 60,
    beat: 4,
    metronomeFlag: true,
    modulationFlag: false,
    gridFlag: false,
    quantizeFlag: false,
    latency: 250,
    torchType: "STEADY",
    torchBlinkFlag: false,
  },
  cmdState: {} as any,
}));
vi.mock("../../src/data", () => ({
  streamList: ["PLAYBACK", "TIMELAPSE", "EMPTY"],
}));
vi.mock("../../src/clientSetting/floatingPosition", () => ({
  floatingPosition: () => ({ top: 0, left: 0, width: 10, height: 10 }),
}));

import { connectFromClient } from "../../src/clientSetting/connectFromClient";
import {
  clientState,
  streamState,
  bpmState,
  arduinoState,
} from "../../src/state";

const resetState = () => {
  for (const k of Object.keys(clientState.client))
    delete (clientState.client as any)[k];
  clientState.cmdClient.length = 0;
  clientState.streamClient.length = 0;
  for (const k of Object.keys(bpmState)) delete (bpmState as any)[k];
  for (const k of Object.keys(clientState.arduinoClient as any))
    delete (clientState.arduinoClient as any)[k];
  (streamState as any).timelapse = false;
  (arduinoState as any).host = "";
};

describe("connectFromClient", () => {
  beforeEach(() => resetState());

  test("/nosound はそのまま return（undefined）", () => {
    const r = connectFromClient(
      { urlPathName: "/nosound" },
      "id1",
      "127.0.0.1",
    );
    expect(r).toBeUndefined();
    expect(Object.keys(clientState.client).length).toBe(0);
  });

  test("/1 は facedetection=true, hanged=false の client を登録し true を返す", () => {
    const r = connectFromClient(
      { urlPathName: "/1", isMobile: false, width: 100, height: 200 },
      "idA",
      "10.0.0.1",
    );
    expect(r).toBe(true);
    expect((clientState.client as any).idA.facedetection).toBe(true);
    expect((clientState.client as any).idA.hanged).toBe(false);
    expect(clientState.cmdClient).toContain("idA");
    expect(clientState.streamClient).toContain("idA");
    expect((streamState as any).timelapse).toBe(true);
    expect((bpmState as any).idA.METRONOME.bpm).toBe(60);
    expect((bpmState as any).idA.stream.PLAYBACK).toBeDefined();
  });

  test("/2 は facedetection=true, hanged=false の client を登録する", () => {
    const r = connectFromClient(
      { urlPathName: "/2", isMobile: false, width: 100, height: 200 },
      "idB",
      "10.0.0.2",
    );
    expect(r).toBe(true);
    expect((clientState.client as any).idB.facedetection).toBe(true);
    expect((clientState.client as any).idB.hanged).toBe(false);
  });

  test("/3 は hanged=true で facedetection=false", () => {
    connectFromClient(
      { urlPathName: "/3", isMobile: false, width: 0, height: 0 },
      "idC",
      "ip",
    );
    expect((clientState.client as any).idC.facedetection).toBe(false);
    expect((clientState.client as any).idC.hanged).toBe(true);
  });

  test("clientMode='client' で project を含めば projection=true", () => {
    const r = connectFromClient(
      {
        clientMode: "client",
        urlPathName: "/project",
        isMobile: false,
        width: 100,
        height: 100,
      },
      "idP",
      "ip",
    );
    expect(r).toBe(true);
    expect((clientState.client as any).idP.projection).toBe(true);
  });

  test("clientMode='noStream' は stream:false で登録 ", () => {
    const r = connectFromClient(
      {
        clientMode: "noStream",
        urlPathName: "/foo",
        isMobile: false,
        width: 0,
        height: 0,
      },
      "idN",
      "ip",
    );
    expect(r).toBe(true);
    expect((clientState.client as any).idN.stream).toBe(false);
  });

  test("clientMode='arduinoClient' は arduinoClient フラグ立て true 返す", () => {
    const r = connectFromClient(
      { clientMode: "arduinoClient", urlPathName: "/x" },
      "idArd",
      "ip",
    );
    expect(r).toBe(true);
    expect((clientState.arduinoClient as any).idArd).toBe(true);
  });

  test("urlPathName に 'pi' を含めば arduinoState.host が設定される", () => {
    connectFromClient(
      {
        clientMode: "client",
        urlPathName: "/pi",
        isMobile: false,
        width: 0,
        height: 0,
      },
      "idPi",
      "192.168.0.10",
    );
    expect(arduinoState.host).toBe("192.168.0.10");
  });
});
