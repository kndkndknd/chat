import { afterEach, describe, expect, test, vi } from "vitest";

// ioState.io はテスト中 null のため、socket 送信はモックして副作用を切る。
vi.mock("../../src/socket/ioEmit", () => ({
  stringEmit: vi.fn(),
}));

import {
  RESETTABLE_PARAMETERS,
  isResettableParameter,
  normalizeParameterName,
  resetParameters,
} from "../../src/parameterChange/resetParameters";
import { cmdState } from "../../src/state/states/cmdState";
import { glitchState } from "../../src/state/states/glitchState";
import { sampleRateState } from "../../src/state/states/sampleRateState";
import { streamState } from "../../src/state/states/streamState";
import { bpmState, bpmStateDefault } from "../../src/state/states/bpmState";

// 既定値から外れた状態を作り、リセットで戻ることを確認する。
const makeDirty = () => {
  cmdState.PORTAMENT = 5;
  cmdState.GAIN.MASTER = 0.1;
  cmdState.FADE.IN = 3;
  cmdState.VOICE = ["c1"];
  cmdState.CLICKFREQ = 100;
  for (const stream of Object.keys(sampleRateState.sampleRate)) {
    sampleRateState.sampleRate[stream] = 22050;
  }
  for (const stream of Object.keys(glitchState.glitch)) {
    glitchState.glitch[stream] = true;
  }
  for (const stream of Object.keys(streamState.random)) {
    streamState.random[stream] = true;
  }
  for (const stream of Object.keys(streamState.filter)) {
    streamState.filter[stream].flag = true;
    streamState.filter[stream].frequency = 5000;
  }
  bpmState["c1"] = {
    bpm: 180,
    METRONOME: { beat: 3, flag: true },
    MODULATION: { beat: 3, flag: true },
    TORCH: { beat: 3, flag: true, type: "BLINK" },
    stream: {
      CHAT: { beat: 3, gridFlag: true, quantizeFlag: true },
    },
  };
};

afterEach(() => {
  delete bpmState["c1"];
});

describe("normalizeParameterName / isResettableParameter", () => {
  test("別名を正規名に寄せる", () => {
    expect(normalizeParameterName("PORT")).toBe("PORTAMENT");
    expect(normalizeParameterName("RATE")).toBe("SAMPLERATE");
    expect(normalizeParameterName("glitch")).toBe("GLITCH");
  });

  test("既知のパラメータだけ true", () => {
    expect(isResettableParameter("GLITCH")).toBe(true);
    expect(isResettableParameter("PORT")).toBe(true);
    expect(isResettableParameter("UNKNOWN")).toBe(false);
  });
});

describe("resetParameters", () => {
  test("targets 省略で全パラメータを初期化し、対象名を返す", () => {
    makeDirty();

    const reset = resetParameters();

    expect(reset).toEqual([...RESETTABLE_PARAMETERS]);
    expect(cmdState.PORTAMENT).toBe(0);
    expect(cmdState.GAIN.MASTER).toBe(1.0);
    expect(cmdState.FADE.IN).toBe(0);
    expect(cmdState.VOICE).toEqual([]);
    expect(cmdState.CLICKFREQ).toBe(440);
    for (const stream of Object.keys(sampleRateState.sampleRate)) {
      expect(sampleRateState.sampleRate[stream]).toBe(44100);
    }
    for (const stream of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[stream]).toBe(false);
    }
    for (const stream of Object.keys(streamState.random)) {
      expect(streamState.random[stream]).toBe(false);
    }
    for (const stream of Object.keys(streamState.filter)) {
      expect(streamState.filter[stream].flag).toBe(false);
      expect(streamState.filter[stream].frequency).toBe(1000);
    }
    expect(bpmState["c1"].bpm).toBe(bpmStateDefault.bpm);
    expect(bpmState["c1"].stream.CHAT.gridFlag).toBe(false);
    expect(bpmState["c1"].stream.CHAT.quantizeFlag).toBe(false);
  });

  test("targets 指定時はその対象だけ初期化する", () => {
    makeDirty();

    const reset = resetParameters(["GLITCH"]);

    expect(reset).toEqual(["GLITCH"]);
    for (const stream of Object.keys(glitchState.glitch)) {
      expect(glitchState.glitch[stream]).toBe(false);
    }
    // 指定していない PORTAMENT は変更されない
    expect(cmdState.PORTAMENT).toBe(5);
  });

  test("別名（PORT / RATE）でも正規名として初期化される", () => {
    makeDirty();

    const reset = resetParameters(["PORT", "RATE"]);

    expect(reset).toEqual(["PORTAMENT", "SAMPLERATE"]);
    expect(cmdState.PORTAMENT).toBe(0);
    for (const stream of Object.keys(sampleRateState.sampleRate)) {
      expect(sampleRateState.sampleRate[stream]).toBe(44100);
    }
  });

  test("空配列は全パラメータ指定として扱う", () => {
    makeDirty();
    expect(resetParameters([])).toEqual([...RESETTABLE_PARAMETERS]);
  });

  test("重複指定は 1 回だけ適用する", () => {
    makeDirty();
    expect(resetParameters(["GLITCH", "glitch"])).toEqual(["GLITCH"]);
  });
});
