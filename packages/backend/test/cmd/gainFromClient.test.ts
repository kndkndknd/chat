import { describe, expect, test, vi, beforeEach } from "vitest";
import type { gainStateType } from "../../../../types";

// cmdState は Redis 永続化プロキシなので、テストではプレーンオブジェクトに差し替える。
vi.mock("../../src/state/states/cmdState", () => ({
  cmdState: {
    GAIN: {
      MASTER: 1.0,
      SINEWAVE: 0.3,
      FEEDBACK: 1,
      WHITENOISE: 1.0,
      CLICK: 0.8,
      BASS: 1.5,
      CHAT: 1.5,
      GLITCH: 2,
      SIMULATE: 1.0,
      METRONOME: 0.9,
    },
  },
}));

import { gainFromClient, gainReqFromClient } from "../../src/cmd/gainFromClient";
import { cmdState } from "../../src/state/states/cmdState";

const DEFAULTS: gainStateType = {
  MASTER: 1.0,
  SINEWAVE: 0.3,
  FEEDBACK: 1,
  WHITENOISE: 1.0,
  CLICK: 0.8,
  BASS: 1.5,
  CHAT: 1.5,
  GLITCH: 2,
  SIMULATE: 1.0,
  METRONOME: 0.9,
};

// IoFacade は emit のみ使用するので最小のフェイクで代用する。
const makeIo = () => {
  const emit = vi.fn();
  return { io: { emit } as any, emit };
};

describe("gainFromClient", () => {
  beforeEach(() => {
    Object.assign(cmdState.GAIN, DEFAULTS);
  });

  test("受信した値で cmdState.GAIN を更新する", () => {
    const { io } = makeIo();
    gainFromClient({ ...DEFAULTS, MASTER: 0.5, BASS: 0.2 } as gainStateType, io);
    expect(cmdState.GAIN.MASTER).toBe(0.5);
    expect(cmdState.GAIN.BASS).toBe(0.2);
  });

  test("cmdState.GAIN に存在しないキーは無視する", () => {
    const { io } = makeIo();
    gainFromClient({ UNKNOWN: 9 } as unknown as gainStateType, io);
    expect((cmdState.GAIN as any).UNKNOWN).toBeUndefined();
  });

  test("部分的な入力でも、配信されるのはマージ後の完全な cmdState.GAIN", () => {
    const { io, emit } = makeIo();
    // CLICK だけを変更して送る
    gainFromClient({ CLICK: 0.1 } as unknown as gainStateType, io);

    expect(emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe("gainFromServer");
    // 変更したキーは反映され、
    expect(payload.CLICK).toBe(0.1);
    // 送られてこなかったキーも欠けずに全て揃っている（正本を配信している）
    expect(payload.MASTER).toBe(1.0);
    expect(payload.SINEWAVE).toBe(0.3);
    expect(Object.keys(payload).sort()).toEqual(Object.keys(DEFAULTS).sort());
  });

  test("配信ペイロードは cmdState.GAIN 自身（生の入力データではない）", () => {
    const { io, emit } = makeIo();
    gainFromClient({ ...DEFAULTS } as gainStateType, io);
    expect(emit.mock.calls[0][1]).toBe(cmdState.GAIN);
  });
});

describe("gainReqFromClient", () => {
  beforeEach(() => {
    Object.assign(cmdState.GAIN, DEFAULTS);
  });

  test("現在の cmdState.GAIN を gainFromServer で配信する（フロントは表示更新のみ）", () => {
    const { io, emit } = makeIo();
    cmdState.GAIN.MASTER = 0.42;

    gainReqFromClient(io);

    expect(emit).toHaveBeenCalledTimes(1);
    const [event, payload] = emit.mock.calls[0];
    expect(event).toBe("gainFromServer");
    expect(payload).toBe(cmdState.GAIN);
    expect(payload.MASTER).toBe(0.42);
  });

  test("cmdState を変更しない（読み取り専用の応答）", () => {
    const { io } = makeIo();
    gainReqFromClient(io);
    expect(cmdState.GAIN).toEqual(DEFAULTS);
  });
});
