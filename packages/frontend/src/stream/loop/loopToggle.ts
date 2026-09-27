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
