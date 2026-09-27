import { filterStateType } from "../../../../../types";

export type loopChunkType = {
  audio: Float32Array;
  sampleRate: number;
  glitch: boolean;
  bufferSize: number;
  duration?: number;
  video?: string;
  source?: string;
  floating?: boolean;
  filter?: filterStateType;
  index?: number;
};

// LOOP再生用に、受信した直近のSTREAMチャンクを保持する専用キャッシュ。
export const loopChunk: { [key: string]: loopChunkType | null } = {
  CHAT: null,
  PLAYBACK: null,
  TIMELAPSE: null,
};
