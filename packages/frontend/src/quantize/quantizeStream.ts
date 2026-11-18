import { quantizeState } from "../state";

// サーバから届いた stream を quantizeState に登録する。
// EMPTY や UPLOAD / RECORD AS などで後から追加された stream も
// quantize の対象にするため、未知の stream は flag=false で追加する。
export const ensureQuantizeStream = (
  stream: string,
  beat = 1,
): { flag: boolean; beat: number } => {
  const current = quantizeState.stream[stream];
  if (current !== undefined) {
    return current;
  }

  const created = { flag: false, beat };
  quantizeState.stream[stream] = created;
  return created;
};
