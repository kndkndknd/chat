import { describe, expect, test, vi } from "vitest";
import WebSocket from "ws";
import { IoFacade } from "../../../src/socket/IoFacade";

describe("IoFacade.to", () => {
  test("emit を持つオブジェクトを返す", () => {
    const facade = new IoFacade();
    const ret = facade.to("anyId");
    expect(typeof ret.emit).toBe("function");
  });

  test("対象 ID に登録された OPEN な ws に対してのみ ws.send が呼ばれる", () => {
    const facade = new IoFacade();
    const sendSpy = vi.fn();
    const ws = { readyState: WebSocket.OPEN, send: sendSpy } as unknown as WebSocket;
    facade.addClient("c1", ws);
    facade.to("c1").emit("ping", { v: 1 });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const arg = sendSpy.mock.calls[0][0];
    expect(JSON.parse(arg)).toEqual({ type: "ping", data: { v: 1 } });
  });

  test("ID が未登録なら send されない", () => {
    const facade = new IoFacade();
    expect(() => facade.to("missing").emit("ping")).not.toThrow();
  });

  test("ws が OPEN でなければ send されない", () => {
    const facade = new IoFacade();
    const sendSpy = vi.fn();
    const ws = {
      readyState: WebSocket.CLOSED,
      send: sendSpy,
    } as unknown as WebSocket;
    facade.addClient("c1", ws);
    facade.to("c1").emit("ping");
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
