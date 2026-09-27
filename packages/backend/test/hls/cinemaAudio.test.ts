import { describe, expect, test } from "vitest";
import { cinemaAudio } from "../../src/hls/cinemaAudio";

describe("cinemaAudio", () => {
  test("/project 端末が接続されていれば、その端末のみ音声 true", () => {
    const clients = {
      p: { urlPathName: "/project" },
      a: { urlPathName: "/1" },
      b: { urlPathName: "/2" },
    };
    expect(cinemaAudio(clients, ["p", "a", "b"])).toEqual({
      p: true,
      a: false,
      b: false,
    });
  });

  test("/project 端末が接続されていなければ全端末で音声 true", () => {
    const clients = {
      a: { urlPathName: "/1" },
      b: { urlPathName: "/2" },
    };
    expect(cinemaAudio(clients, ["a", "b"])).toEqual({ a: true, b: true });
  });

  test("/project 端末が接続されていれば、対象外の端末も音声 false", () => {
    const clients = {
      p: { urlPathName: "/project" },
      a: { urlPathName: "/1" },
    };
    expect(cinemaAudio(clients, ["a"])).toEqual({ a: false });
  });

  test("接続情報が無い対象端末は、/project 不在時のみ音声 true", () => {
    expect(cinemaAudio({}, ["x"])).toEqual({ x: true });
    expect(cinemaAudio({ p: { urlPathName: "/project" } }, ["x"])).toEqual({
      x: false,
    });
  });
});
