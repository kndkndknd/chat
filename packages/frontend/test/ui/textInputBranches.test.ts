import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toggleGainUI: vi.fn(),
  hideGainUI: vi.fn(),
  textPrint: vi.fn(),
  erasePrint: vi.fn(),
  eraseText: vi.fn(),
  bass: vi.fn(),
  sinewave: vi.fn(),
  voice: vi.fn(),
}));

vi.mock("../../src/ui/gainUI", () => ({
  toggleGainUI: mocks.toggleGainUI,
  hideGainUI: mocks.hideGainUI,
}));
vi.mock("../../src/canvasEvent", () => ({
  textPrint: mocks.textPrint,
  erasePrint: mocks.erasePrint,
  eraseText: mocks.eraseText,
}));
vi.mock("../../src/webaudio", () => ({
  bass: mocks.bass,
  sinewave: mocks.sinewave,
}));
vi.mock("../../src/voice", () => ({ voice: mocks.voice }));

const canvas = {} as HTMLCanvasElement;
const context = {} as CanvasRenderingContext2D;

let keyDown: typeof import("../../src/textInput").keyDown;

const load = async (): Promise<void> => {
  vi.resetModules();
  keyDown = (await import("../../src/textInput")).keyDown;
};

describe("textInput keyDown branches", () => {
  let socket: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (window as any).location.pathname = "/";
    socket = { emit: vi.fn() };
    await load();
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as any).location.pathname = "/";
  });

  it("通常文字は大文字化して送信し、表示に反映する", () => {
    const next = keyDown({ key: "a" } as KeyboardEvent, "", socket as any, canvas, context);

    expect(next).toBe("A");
    expect(socket.emit).toHaveBeenCalledWith("charFromClient", "A");
    expect(mocks.textPrint).toHaveBeenCalledWith("A");
    expect(mocks.eraseText).toHaveBeenCalledWith(context, canvas);
  });

  it("Enter は文字を送信して入力をクリアする", () => {
    const next = keyDown({ key: "Enter" } as KeyboardEvent, "ABC", socket as any, canvas, context);

    expect(next).toBe("");
    expect(socket.emit).toHaveBeenCalledWith("charFromClient", "Enter");
    expect(mocks.textPrint).toHaveBeenCalledWith("");
  });

  it("VOICE 入力中の Enter は入力を保持する", () => {
    const next = keyDown({ key: "Enter" } as KeyboardEvent, "VOICE", socket as any, canvas, context);

    expect(next).toBe("VOICE");
    expect(socket.emit).toHaveBeenCalledWith("charFromClient", "Enter");
    expect(mocks.textPrint).toHaveBeenCalledWith("VOICE");
  });

  it("e.key が無い場合は keyCode から文字を解決する", () => {
    const next = keyDown({ keyCode: 65 } as KeyboardEvent, "", socket as any, canvas, context);

    expect(next).toBe("A");
    expect(socket.emit).toHaveBeenCalledWith("charFromClient", "A");
  });

  it("バックスラッシュは BASS をトグルする", () => {
    keyDown({ key: "\\" } as KeyboardEvent, "", socket as any, canvas, context);
    expect(mocks.bass).toHaveBeenLastCalledWith(true, 0.4);
    expect(mocks.textPrint).toHaveBeenLastCalledWith("BASS");

    keyDown({ key: "\\" } as KeyboardEvent, "", socket as any, canvas, context);
    expect(mocks.bass).toHaveBeenLastCalledWith(false, 0.4);
    expect(mocks.erasePrint).toHaveBeenCalledWith(context, canvas);
  });

  it("nosound パスでは BASS を発音しない", () => {
    (window as any).location.pathname = "/nosound";

    keyDown({ key: "\\" } as KeyboardEvent, "", socket as any, canvas, context);

    expect(mocks.bass).not.toHaveBeenCalled();
    expect(mocks.textPrint).not.toHaveBeenCalled();
  });

  it("/counter は rotateReq をクールダウン付きで送る", () => {
    (window as any).location.pathname = "/counter";

    keyDown({ key: "1" } as KeyboardEvent, "", socket as any, canvas, context);
    expect(socket.emit).toHaveBeenCalledWith("rotateReqFromClient", true);
    expect(mocks.textPrint).toHaveBeenLastCalledWith("1");

    keyDown({ key: "2" } as KeyboardEvent, "1", socket as any, canvas, context);
    expect(
      socket.emit.mock.calls.filter(
        ([event, value]) => event === "rotateReqFromClient" && value === true,
      ),
    ).toHaveLength(1);

    vi.advanceTimersByTime(60_000);
    expect(socket.emit).toHaveBeenCalledWith("rotateReqFromClient", false);
  });
});
