import { beforeEach, describe, expect, it, vi } from "vitest";

const { clickMock } = vi.hoisted(() => ({ clickMock: vi.fn() }));

vi.mock("../../src/webaudio/sound/click", () => ({
  click: clickMock,
}));

type GainUIModule = typeof import("../../src/ui/gainUI");
type StateModule = typeof import("../../src/state");

class FakeElement {
  tagName: string;
  children: FakeElement[] = [];
  style: Record<string, string> = { cssText: "" };
  textContent = "";
  id = "";
  type = "";
  min = "";
  max = "";
  step = "";
  value = "";
  disabled = false;
  private listeners = new Map<string, Array<() => void>>();

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  addEventListener(type: string, listener: () => void): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  dispatchEvent(type: string): void {
    (this.listeners.get(type) ?? []).forEach((listener) => listener());
  }
}

describe("GAIN UI", () => {
  let initGainUI: GainUIModule["initGainUI"];
  let toggleGainUI: GainUIModule["toggleGainUI"];
  let hideGainUI: GainUIModule["hideGainUI"];
  let setGainUI: GainUIModule["setGainUI"];
  let socketState: StateModule["socketState"];
  let emit: ReturnType<typeof vi.fn>;
  let body: FakeElement;

  const initialize = async (): Promise<void> => {
    vi.resetModules();
    const state = await import("../../src/state");
    socketState = state.socketState;
    emit = vi.fn();
    socketState.socket = { emit } as any;

    body = new FakeElement("body");
    (globalThis as any).document = {
      createElement: (tagName: string) => new FakeElement(tagName),
      body,
    };

    ({ initGainUI, toggleGainUI, hideGainUI, setGainUI } = await import(
      "../../src/ui/gainUI"
    ));
  };

  const rowInput = (index: number): FakeElement =>
    body.children[0].children[index].children[1];
  const rowValue = (index: number): FakeElement =>
    body.children[0].children[index].children[2];

  beforeEach(async () => {
    clickMock.mockClear();
    await initialize();
  });

  it("10項目のスライダーを初期化し、同期前は無効にする", () => {
    initGainUI();

    const container = body.children[0];
    expect(container.children).toHaveLength(10);
    expect(container.children[0].children[0].textContent).toBe("MASTER");
    expect(container.children[9].children[0].textContent).toBe("METRONOME");
    expect(rowInput(0).disabled).toBe(true);
    expect(rowInput(0).value).toBe("1");
    expect(rowValue(0).textContent).toBe("--");
    expect(emit).toHaveBeenCalledWith("gainReqFromClient");
  });

  it("setGainUI でスライダーを有効化して値を反映する", () => {
    initGainUI();
    setGainUI({ MASTER: 0.5, CHAT: 1.25 });

    expect(rowInput(0).disabled).toBe(false);
    expect(rowInput(0).value).toBe("0.5");
    expect(rowValue(0).textContent).toBe("0.50");
    expect(rowInput(6).value).toBe("1.25");
    expect(rowValue(6).textContent).toBe("1.25");
  });

  it("スライダー操作では変更したキーだけを送信する", () => {
    initGainUI();
    setGainUI({ MASTER: 0.5 });
    emit.mockClear();

    const master = rowInput(0);
    master.value = "0.75";
    master.dispatchEvent("input");

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("gainFromClient", { MASTER: 0.75 });
    expect(rowValue(0).textContent).toBe("0.75");

    emit.mockClear();
    const chat = rowInput(6);
    chat.value = "1.5";
    chat.dispatchEvent("input");

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("gainFromClient", { CHAT: 1.5 });
  });

  it("スライダー操作時の範囲外値をクランプする", () => {
    initGainUI();
    setGainUI({ MASTER: 0.5 });
    emit.mockClear();

    const master = rowInput(0);
    master.value = "3";
    master.dispatchEvent("input");

    expect(emit).toHaveBeenCalledWith("gainFromClient", { MASTER: 2 });
    expect(rowValue(0).textContent).toBe("2.00");
  });

  it("CLICK の change で1回だけクリック音を鳴らす", () => {
    initGainUI();
    setGainUI({ CLICK: 0.4 });

    const clickInput = rowInput(4);
    clickInput.value = "0.6";
    clickInput.dispatchEvent("change");

    expect(clickMock).toHaveBeenCalledWith(0.6, 440);
  });

  it("GAIN UI の表示をトグルし、開くたびに同期を要求する", () => {
    initGainUI();
    const container = body.children[0];
    emit.mockClear();

    toggleGainUI();
    expect(container.style.display).toBe("flex");
    expect(emit).toHaveBeenCalledWith("gainReqFromClient");

    emit.mockClear();
    toggleGainUI();
    expect(container.style.display).toBe("none");
    expect(emit).not.toHaveBeenCalled();
  });

  it("hideGainUI で表示だけを閉じ、同期要求は送らない", () => {
    initGainUI();
    const container = body.children[0];
    toggleGainUI();
    expect(container.style.display).toBe("flex");

    emit.mockClear();
    hideGainUI();

    expect(container.style.display).toBe("none");
    expect(emit).not.toHaveBeenCalled();
  });

  it("範囲外・不正値をクランプし、欠損は直前値へフォールバックする", () => {
    const first = setGainUI({
      MASTER: 3,
      SINEWAVE: -1,
      CHAT: Number.NaN,
      GLITCH: "invalid",
    } as any);

    expect(first.MASTER).toBe(2);
    expect(first.SINEWAVE).toBe(0);
    expect(first.CHAT).toBe(1);
    expect(first.GLITCH).toBe(1);
    expect(first.BASS).toBe(1);

    const second = setGainUI({ MASTER: 0.5 });

    expect(second.MASTER).toBe(0.5);
    expect(second.CHAT).toBe(1);
    expect(second.GLITCH).toBe(1);
    expect(second.BASS).toBe(1);
  });

  it("null を受けても直前値で補完する", () => {
    const previous = setGainUI({ MASTER: 0.25, CHAT: 0.75 });
    const next = setGainUI(null);

    expect(next.MASTER).toBe(0.25);
    expect(next.CHAT).toBe(0.75);
    expect(next).toEqual(previous);
  });
});
