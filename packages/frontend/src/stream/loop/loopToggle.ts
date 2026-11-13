import { streamState } from "../../state";

export const loopToggle = (stream: string, target: string): void => {
  if (!streamState.loop[stream]) {
    streamState.loop[stream] = [];
  }
  if (streamState.loop[stream].includes(target)) {
    streamState.loop[stream] = streamState.loop[stream].filter(
      (item) => item !== target,
    );
  } else {
    streamState.loop[stream].push(target);
  }
};

// STOP 時の解除。トグルではなく必ず対象を削除する。
export const loopClear = (stream: string, target: string): void => {
  if (!streamState.loop[stream]) {
    streamState.loop[stream] = [];
    return;
  }
  streamState.loop[stream] = streamState.loop[stream].filter(
    (item) => item !== target,
  );
};
