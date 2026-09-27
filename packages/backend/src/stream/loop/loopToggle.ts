import { currentState, streamState } from "../../state";
import { loopToggleEmit } from "../../socket/ioEmit";

export const loopToggle = (option?: { stream?: string; target?: string }): void => {
  // 旧スキーマ(loop: boolean)が Redis に残っている場合の移行
  if (typeof streamState.loop !== "object" || streamState.loop === null) {
    streamState.loop = { CHAT: [], PLAYBACK: [], TIMELAPSE: [] };
  }

  const activeStreams = Object.keys(currentState.stream).filter(
    (key) => currentState.stream[key],
  );
  const stream =
    option?.stream ??
    activeStreams[Math.floor(Math.random() * activeStreams.length)];
  if (stream === undefined || streamState.target[stream] === undefined) {
    return;
  }

  const targets = streamState.target[stream];
  const target =
    option?.target ?? targets[Math.floor(Math.random() * targets.length)];
  if (target === undefined) {
    return;
  }

  if (!streamState.loop[stream]) {
    streamState.loop[stream] = [];
  }

  if (streamState.loop[stream].includes(target)) {
    // LOOP解除: 対象をループ配列から外し、配信対象へ戻す
    streamState.loop[stream] = streamState.loop[stream].filter(
      (item) => item !== target,
    );
    if (!streamState.target[stream].includes(target)) {
      streamState.target[stream].push(target);
    }
  } else {
    // LOOP開始: 対象をループ配列へ入れ、新規配信の対象から外す
    streamState.loop[stream].push(target);
    streamState.target[stream] = streamState.target[stream].filter(
      (item) => item !== target,
    );
  }

  loopToggleEmit(stream, target);
};
